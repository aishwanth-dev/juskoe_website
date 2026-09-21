import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { requestDownload } from "@/lib/download";
import { usePlatform } from "@/lib/platform";
import MacInstructionsModal from "./MacInstructionsModal";

/** The four-square Windows logo — same path used across Hero/Navbar/Footer/CTA. */
const WindowsIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
);

/** The Apple glyph — same path used in Hero.tsx's former "Mac — Coming Soon" pill. */
const AppleIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

type Size = "nav" | "hero" | "cta" | "footer" | "pricing";

/** Per-size paddings/font-sizes/border-radius, matched to each call site's existing markup. */
const sizeStyles: Record<
  Size,
  { padding: string; fontSize: number; borderRadius: number; iconSize: number; gap: number; fontWeight: number }
> = {
  nav: { padding: "8px 20px", fontSize: 14, borderRadius: 8, iconSize: 14, gap: 6, fontWeight: 700 },
  hero: { padding: "14px 32px", fontSize: 14, borderRadius: 8, iconSize: 16, gap: 10, fontWeight: 700 },
  cta: { padding: "16px 40px", fontSize: 16, borderRadius: 10, iconSize: 20, gap: 10, fontWeight: 700 },
  footer: { padding: "8px 16px", fontSize: 12, borderRadius: 8, iconSize: 14, gap: 8, fontWeight: 600 },
  pricing: { padding: "12px 20px", fontSize: 14, borderRadius: 10, iconSize: 16, gap: 8, fontWeight: 700 },
};

interface PlatformDownloadButtonProps {
  /** Visual size — mirrors the differing button sizes across the 5 sites */
  size?: Size;
  /** Called after a successful click (e.g. to close a mobile menu) — optional */
  onAfterClick?: () => void;
  className?: string;
  /** Show both Windows and Mac buttons side-by-side (used in Hero section) */
  showBoth?: boolean;
}

/**
 * The single Download button used across Navbar/Hero/Pricing/Footer/CTA.
 *
 * Detects the visitor's platform once on mount and renders exactly one
 * variant — Windows (blue) or Mac (black, with a BETA badge). "other"
 * (SSR/unknown UA) falls back to the Windows variant, since most non-Mac
 * visitors are Windows-ish and that's the safer default.
 */
const PlatformDownloadButton = ({ size = "hero", onAfterClick, className, showBoth }: PlatformDownloadButtonProps) => {
  const platform = usePlatform();
  const isMac = platform === "mac";
  const s = sizeStyles[size];

  const [modalOpen, setModalOpen] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeModal = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    setModalOpen(false);
  };

  const handleWindowsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    void requestDownload({ target: "windows" });
    onAfterClick?.();
  };

  const handleMacClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // The modal IS the feedback here, so no toast — kick the download off in
    // the background while the visitor reads the one-time setup steps.
    void requestDownload({ target: "mac", notify: false });
    setModalOpen(true);
    dismissTimer.current = setTimeout(() => {
      console.log('Mac modal auto-closing after 15s');
      setModalOpen(false);
    }, 15000);
    onAfterClick?.();
  };

  // Define button content based on platform/showBoth
  let buttonContent: JSX.Element;

  if (showBoth) {
    buttonContent = (
      <>
        {/* Windows button */}
        <motion.a
          href="#"
          onClick={handleWindowsClick}
          whileHover={{ scale: 1.03, boxShadow: "0 12px 32px rgba(0,120,212,0.35)" }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: s.gap,
            padding: s.padding,
            background: "linear-gradient(135deg, #0078D4, #106EBE)",
            color: "#ffffff",
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            borderRadius: s.borderRadius,
            textDecoration: "none",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          <WindowsIcon style={{ width: s.iconSize, height: s.iconSize, flexShrink: 0 }} />
          Download
        </motion.a>

        {/* Mac button */}
        <motion.a
          href="#"
          onClick={handleMacClick}
          whileHover={{ scale: 1.03, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
          whileTap={{ scale: 0.97 }}
          style={{
            position: "relative",
            overflow: "visible",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: s.gap,
            padding: s.padding,
            background: "#0a0a0a",
            color: "#ffffff",
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            borderRadius: s.borderRadius,
            textDecoration: "none",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          <AppleIcon style={{ width: s.iconSize, height: s.iconSize, flexShrink: 0 }} />
          Download
          <span
            style={{
              position: "absolute",
              top: -7,
              right: 6,
              padding: "1.5px 5px",
              borderRadius: 5,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: "#f59e0b",
              color: "#1a1a1a",
              lineHeight: 1.4,
            }}
          >
            BETA
          </span>
        </motion.a>
      </>
    );
  } else if (isMac) {
    buttonContent = (
      <motion.a
        href="#"
        onClick={handleMacClick}
        whileHover={{ scale: 1.03, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
        whileTap={{ scale: 0.97 }}
        className={className}
        style={{
          position: "relative",
          overflow: "visible",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: s.gap,
          padding: s.padding,
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          borderRadius: s.borderRadius,
          textDecoration: "none",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        <AppleIcon style={{ width: s.iconSize, height: s.iconSize, flexShrink: 0 }} />
        Download
        <span
          style={{
            position: "absolute",
            top: -7,
            right: 6,
            padding: "1.5px 5px",
            borderRadius: 5,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.08em",
            background: "#f59e0b",
            color: "#1a1a1a",
            lineHeight: 1.4,
          }}
        >
          BETA
        </span>
      </motion.a>
    );
  } else {
    buttonContent = (
      <motion.a
        href="#"
        onClick={handleWindowsClick}
        whileHover={{ scale: 1.03, boxShadow: "0 12px 32px rgba(0,120,212,0.35)" }}
        whileTap={{ scale: 0.97 }}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: s.gap,
          padding: s.padding,
          background: "linear-gradient(135deg, #0078D4, #106EBE)",
          color: "#ffffff",
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          borderRadius: s.borderRadius,
          textDecoration: "none",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        <WindowsIcon style={{ width: s.iconSize, height: s.iconSize, flexShrink: 0 }} />
        Download
      </motion.a>
    );
  }

  // Single modal instance at component root, always present
  return (
    <>
      {buttonContent}
      <MacInstructionsModal open={modalOpen} onClose={closeModal} />
    </>
  );
};

export default PlatformDownloadButton;
