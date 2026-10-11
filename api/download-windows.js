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
 *   - its top-level `path:` field names the installer asset for that release;
 *   - its top-level `version:` field names the release that asset lives in.
 *
 * WHY THE REDIRECT IS TAG-PINNED (PRODUCTION INCIDENT, DO NOT REGRESS)
 * --------------------------------------------------------------------
 * This function used to redirect to `releases/latest/download/<filename>`.
 * That URL shape is UNSAFE for the installer, because GitHub resolves the TAG
 * (`latest`) and the FILENAME independently at request time. Vercel edge-cached
 * a 302 holding the then-current filename `Juskoe-Setup-1.0.0.exe`; once v1.0.1
 * was published, `latest` started resolving to tag v1.0.1 and GitHub looked for
 * the 1.0.0 asset inside the 1.0.1 release. That asset only exists in v1.0.0,
 * so every download 404'd on
 * `.../releases/download/v1.0.1/Juskoe-Setup-1.0.0.exe`.
 *
 * The tag and the filename must therefore be resolved ATOMICALLY, from one read
 * of one manifest, and the redirect must name the tag explicitly:
 * `releases/download/v<version>/<filename>`. A stale cached 302 then still
 * points at a release where that asset really exists — it is merely old, never
 * broken. `latest/download` is kept ONLY for fetching `latest.yml`, whose name
 * is fixed and so cannot go stale.
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

/**
 * Unversioned `latest/download` path.
 *
 * SAFE for `latest.yml` (fixed filename, cannot go stale). NEVER use it for the
 * installer redirect — see the production incident in the header comment.
 */
const RELEASE_BASE = "https://github.com/juskoeapp/juskoe.app/releases/latest/download";

/** Tag-pinned asset path; `${RELEASE_DOWNLOAD_BASE}/v<version>/<filename>`. */
const RELEASE_DOWNLOAD_BASE = "https://github.com/juskoeapp/juskoe.app/releases/download";

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
 * Top-level `version:` line of `latest.yml`, which names the release tag.
 *
 * Line-anchored with no leading whitespace allowed, for the same reason as
 * `PATH_LINE`: only the document-level key, never a nested one.
 */
const VERSION_LINE = /^version:\s*(\S+)\s*$/m;

/**
 * Versions we are willing to interpolate into a URL: strict semver with an
 * optional pre-release/build suffix.
 *
 * This is the second half of the security boundary. The version lands in the
 * PATH of the redirect target, so a tampered manifest claiming
 * `version: ../../evil` must never compose a URL that escapes the release
 * namespace.
 */
const SAFE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/;

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

/**
 * Pulls the release version out of a `latest.yml` body.
 *
 * Returns null when the top-level `version:` line is missing or fails the
 * semver guard, so callers can decide what to do rather than interpolating an
 * untrusted value.
 */
export function parseVersion(yaml) {
  if (typeof yaml !== "string") return null;

  const match = yaml.match(VERSION_LINE);
  if (!match) return null;

  const candidate = match[1];
  return SAFE_VERSION.test(candidate) ? candidate : null;
}

/**
 * Composes the installer URL from a manifest's version + filename pair.
 *
 * With a usable version this is TAG-PINNED, which is the whole point of this
 * module: the tag and filename come from the same manifest read, so a cached
 * 302 can never map an old filename onto a newer tag.
 *
 * With no usable version it degrades to the unversioned `latest/download`
 * form. That path REINTRODUCES the stale-tag bug that broke production, so it
 * exists only as a last resort before `FALLBACK_URL` — better a URL that is
 * right now and may go stale in five minutes than refusing the download
 * outright. Callers should log when they take it.
 */
export function buildInstallerUrl(version, filename) {
  return version
    ? `${RELEASE_DOWNLOAD_BASE}/v${version}/${filename}`
    : `${RELEASE_BASE}/${filename}`;
}

/**
 * 302 to the newest installer.
 *
 * Edge-cached for only 60s (was 300s): a cached redirect delays a freshly
 * published release from reaching visitors, so keep that window short and let
 * `stale-while-revalidate` absorb the traffic while it refreshes.
 */
function redirectToLatest(res, version, filename) {
  if (!version) {
    console.warn(
      "[download-windows] latest.yml had no usable version; " +
        "falling back to unpinned latest/download URL (stale-tag risk)",
    );
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Location", buildInstallerUrl(version, filename));
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

  // Resolved from the SAME manifest read as the filename, so the pair is
  // atomic. A null version is tolerated (see `buildInstallerUrl`).
  const version = parseVersion(yaml);

  redirectToLatest(res, version, filename);
}
