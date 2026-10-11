/**
 * GET /download/windows → 302 to the newest Windows installer on GitHub.
 *
 * WHY THIS FUNCTION EXISTS
 * ------------------------
 * Visitors only ever see `https://juskoe.in/download/windows` (see
 * `src/lib/download.ts`). That stable path has to resolve to whatever the
 * newest release's installer is called — and installer filenames carry the
 * version (`Juskoe-Setup-1.0.0.exe`), so the name changes every release.
 * Hardcoding it in `vercel.json` meant a manual site edit per release; this
 * function removes that step entirely.
 *
 * WHY `latest.yml` IS THE DISCOVERY MECHANISM
 * -------------------------------------------
 * `https://github.com/<owner>/<repo>/releases/latest/download/latest.yml`
 *   - has a FIXED filename, so it needs no version knowledge to request;
 *   - is guaranteed present in every release, because electron-updater
 *     requires it for the desktop app's auto-update flow — nobody can ship a
 *     release without it;
 *   - its top-level `path:` field names the installer asset for that release.
 *
 * The GitHub REST API (`/releases/latest`) would be the obvious alternative,
 * but unauthenticated calls are capped at 60 requests/hour PER IP, and Vercel
 * serverless functions egress from shared IPs — the budget would be burned by
 * other tenants and our downloads would start failing. Fetching a release
 * asset over the plain download endpoint has no such limit.
 *
 * WHY A REDIRECT, NEVER A PROXY
 * -----------------------------
 * Only a 302 is returned; the installer bytes travel straight from GitHub to
 * the browser and never pass through Vercel. That is not just an efficiency
 * preference: a rewrite/proxy would run the ~100 MB installer through the
 * function response path, which is capped at 4.5 MB on Vercel, so proxying
 * cannot work at all. GitHub serves release assets with
 * `Content-Disposition: attachment`, so following the redirect downloads the
 * file instead of navigating away from the site.
 *
 * NET EFFECT
 * ----------
 * Publishing a new release requires NO website change and NO extra asset
 * upload: the next request reads the new `latest.yml` and redirects to the new
 * installer.
 */

/** Release repo that holds the published installers. */
const RELEASE_BASE = "https://github.com/juskoeapp/juskoe.app/releases/latest/download";

/** Fixed-name electron-updater manifest that names the current installer. */
const MANIFEST_URL = `${RELEASE_BASE}/latest.yml`;

/**
 * Last-resort target used whenever the manifest cannot be read or trusted.
 *
 * Pinned to a known-good, version-locked asset so a transient GitHub hiccup,
 * a timeout, or a malformed manifest still gives the visitor a working
 * installer (possibly an older version) rather than an error page. Downloads
 * staying up matters more here than always being newest.
 *
 * MAINTENANCE: if the v1.0.0 release or its asset is ever deleted, this URL
 * must be repointed at another release that definitely still exists.
 */
const FALLBACK_URL =
  "https://github.com/juskoeapp/juskoe.app/releases/download/v1.0.0/Juskoe-Setup-1.0.0.exe";

/** Hard ceiling on the manifest fetch so a hung request can't stall the function. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Installer filenames we are willing to redirect to: a bare filename only.
 *
 * This is the security boundary. It rejects path traversal
 * (`../../etc/passwd.exe`), absolute URLs (`https://evil.example.com/x.exe`,
 * which contains `:` and `/`), and anything with a slash or protocol, so a
 * malformed or tampered `latest.yml` can never point our users somewhere
 * unintended.
 */
const SAFE_FILENAME = /^[A-Za-z0-9._-]+\.exe$/;

/**
 * Top-level `path:` line of `latest.yml`, which names the installer.
 *
 * Line-anchored (`^` with the `m` flag) and NOT allowing leading whitespace,
 * so it matches only the document-level key and never the indented
 * `  - url: ...` entry nested under `files:`.
 */
const PATH_LINE = /^path:\s*(\S+\.exe)\s*$/m;

/**
 * Fallback parse: the first `url:` entry under `files:`, used only when a
 * top-level `path:` is absent. Leading whitespace and the list dash are
 * allowed here because this key is nested.
 */
const URL_LINE = /^\s*-?\s*url:\s*(\S+\.exe)\s*$/m;

/**
 * Pulls the installer filename out of a `latest.yml` body.
 *
 * `path:` wins over the nested `url:` line; returns null when neither is
 * present or the candidate fails the filename guard.
 */
export function parseInstallerName(yaml) {
  if (typeof yaml !== "string") return null;

  const match = yaml.match(PATH_LINE) ?? yaml.match(URL_LINE);
  if (!match) return null;

  const candidate = match[1];
  return SAFE_FILENAME.test(candidate) ? candidate : null;
}

/** 302 to the newest installer; cached at Vercel's edge for 5 minutes. */
function redirectToLatest(res, filename) {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Location", `${RELEASE_BASE}/${filename}`);
  res.statusCode = 302;
  res.end();
}

/** 302 to the pinned installer. Never cached — the next request should retry. */
function redirectToFallback(res, reason) {
  console.error(`[download-windows] falling back to pinned installer: ${reason}`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", FALLBACK_URL);
  res.statusCode = 302;
  res.end();
}

export default async function handler(req, res) {
  // A download link is a plain navigation: nothing else should reach here.
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  let yaml;
  try {
    // `redirect: "follow"` is the default and is what we want: the
    // `/releases/latest/download/...` endpoint redirects to the asset CDN.
    const response = await fetch(MANIFEST_URL, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      redirectToFallback(res, `latest.yml responded ${response.status}`);
      return;
    }

    yaml = await response.text();
  } catch (error) {
    // Network failure, DNS failure, or the 8s timeout firing.
    redirectToFallback(res, `latest.yml fetch failed: ${error?.message ?? error}`);
    return;
  }

  const filename = parseInstallerName(yaml);
  if (!filename) {
    redirectToFallback(res, "latest.yml had no usable installer filename");
    return;
  }

  redirectToLatest(res, filename);
}
