import { useEffect, useState } from "react";

export type DetectedPlatform = "windows" | "mac" | "other";

/** Detect the visitor's OS from the browser. SSR/no-window safe (returns "other"). */
export function detectPlatform(): DetectedPlatform {
  if (typeof navigator === "undefined") return "other";
  const platform = (navigator.platform || "").toLowerCase();
  const ua = (navigator.userAgent || "").toLowerCase();
  if (platform.includes("mac") || ua.includes("mac os") || ua.includes("macintosh")) return "mac";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  return "other";
}

/**
 * React hook: current platform, resolved once on mount.
 *
 * Starts as "other" (matches the server/first-paint state) and updates once
 * `useEffect` runs on the client, mirroring the `useIsIndia` hook in
 * Pricing.tsx — same shape, just a different detector.
 */
export const usePlatform = (): DetectedPlatform => {
  const [platform, setPlatform] = useState<DetectedPlatform>("other");
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);
  return platform;
};
