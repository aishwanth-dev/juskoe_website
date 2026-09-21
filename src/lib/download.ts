import { toast } from "sonner";
import { getSession } from "@/lib/supabase";
import { recordDownload } from "@/lib/stats";

/**
 * Canonical Windows installer URL.
 *
 * Hosted on Firebase Storage rather than bundled in the site's `public/`
 * folder, so shipping a new build does not require a site deploy.
 *
 * Because this is cross-origin, `openViaAnchor` must NOT set a `download`
 * attribute: browsers ignore `download` for cross-origin URLs, and Firebase
 * already serves the object with a download disposition via `alt=media`, so a
 * plain anchor click transfers the file correctly.
 */
export const DOWNLOAD_URL = "https://firebasestorage.googleapis.com/v0/b/juskoe-7698d.firebasestorage.app/o/Juskoe%20Setup%201.0.0.exe?alt=media&token=f72ce8d0-30d5-408d-bee5-958d922bff6d";

// Mac ARM64 .dmg installer (macOS 12+, Apple Silicon optimized).
export const MAC_DOWNLOAD_URL = "https://firebasestorage.googleapis.com/v0/b/juskoe-7698d.firebasestorage.app/o/Juskoe-1.0.0-arm64.dmg?alt=media&token=77138c2d-2d40-4542-a15e-47250b260a7c";

/** Two builds are shipped today; the intent is stored as one of these targets. */
export type DownloadTarget = "windows" | "mac";

/** sessionStorage key, mirroring the `juskoe:resume-checkout` intent pattern. */
const RESUME_KEY = "juskoe:resume-download";

const isTarget = (value: string | null): value is DownloadTarget =>
  value === "windows" || value === "mac";

/**
 * Remember that the visitor asked for the installer, so /login (or the OAuth
 * callback) can finish the job once they have a session.
 */
export const rememberDownloadIntent = (target: DownloadTarget = "windows") => {
  try {
    sessionStorage.setItem(RESUME_KEY, target);
  } catch {
    /* storage disabled — the user simply clicks Download again once signed in */
  }
};

/** Reads and clears a pending download intent. */
export const takeDownloadIntent = (): DownloadTarget | null => {
  try {
    const value = sessionStorage.getItem(RESUME_KEY);
    if (value !== null) sessionStorage.removeItem(RESUME_KEY);
    return isTarget(value) ? value : null;
  } catch {
    return null;
  }
};

/** Non-destructive peek, for UI that wants to say "download will start". */
export const hasPendingDownload = (): boolean => {
  try {
    return isTarget(sessionStorage.getItem(RESUME_KEY));
  } catch {
    return false;
  }
};

/** How the URL is handed to the browser. Swappable so tests stay side-effect free. */
export type OpenUrl = (url: string) => void;

/**
 * Default trigger: a throwaway anchor click. Preferred over
 * `window.location.assign` because it leaves the current page (and its React
 * state) untouched while the browser takes over the file transfer.
 */
const openViaAnchor: OpenUrl = (url) => {
  if (typeof document === "undefined") {
    if (typeof window !== "undefined") window.location.assign(url);
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Starts the installer download right now, no auth check. Returns the URL used. */
export const startDownload = (open: OpenUrl = openViaAnchor): string => {
  open(DOWNLOAD_URL);
  // Count the completed download. Fire-and-forget; never blocks the transfer.
  void recordDownload();
  return DOWNLOAD_URL;
};

/** Starts the Mac installer download right now, no auth check. Returns the URL used. */
export const startMacDownload = (open: OpenUrl = openViaAnchor): string => {
  open(MAC_DOWNLOAD_URL);
  // Count the completed download. Fire-and-forget; never blocks the transfer.
  void recordDownload();
  return MAC_DOWNLOAD_URL;
};

export interface RequestDownloadOptions {
  /** Called when the user must sign in first (defaults to a redirect to /login). */
  onNeedsAuth?: () => void;
  /** Override the browser hand-off (tests). */
  open?: OpenUrl;
  /** Set false to stay quiet, e.g. when resuming right after sign-in. */
  notify?: boolean;
  /** Which build to fetch. Defaults to "windows". */
  target?: DownloadTarget;
}

const successToastDescription = (target: DownloadTarget): string =>
  target === "mac" ? "Juskoe for macOS." : "Juskoe Setup 1.0.0 for Windows.";

/**
 * The single entry point behind every Download button on the site.
 *
 * Signed out → remembers the intent and sends the user to /login.
 * Signed in  → starts the download immediately.
 *
 * Resolves to true only when the download actually started.
 */
export const requestDownload = async (
  options: RequestDownloadOptions = {}
): Promise<boolean> => {
  const notify = options.notify ?? true;
  const target = options.target ?? "windows";
  const session = await getSession();

  if (!session?.access_token) {
    rememberDownloadIntent(target);
    if (notify) {
      toast.info("Sign in to download", {
        description: "Your download starts automatically once you're signed in.",
      });
    }
    if (options.onNeedsAuth) options.onNeedsAuth();
    else if (typeof window !== "undefined") window.location.assign("/login");
    return false;
  }

  if (target === "mac") startMacDownload(options.open);
  else startDownload(options.open);

  if (notify) {
    toast.success("Your download is starting…", {
      description: successToastDescription(target),
    });
  }
  return true;
};

/**
 * Finishes a download the visitor asked for before signing in. Safe to call on
 * every auth success — a no-op when nothing is pending.
 */
export const resumePendingDownload = (options: RequestDownloadOptions = {}): boolean => {
  const target = takeDownloadIntent();
  if (!target) return false;

  if (target === "mac") startMacDownload(options.open);
  else startDownload(options.open);

  if (options.notify ?? true) {
    toast.success("Your download is starting…", {
      description: successToastDescription(target),
    });
  }
  return true;
};
