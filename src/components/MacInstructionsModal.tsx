import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const TERMINAL_COMMAND = "xattr -cr /Applications/Juskoe.app";
const COUNTDOWN_SECONDS = 15;

interface MacInstructionsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * One-time Gatekeeper workaround shown right after a Mac download starts.
 *
 * Renders through a portal into document.body so its `position: fixed`
 * backdrop is positioned against the real viewport, not against any
 * transformed ancestor (Hero's scroll-linked motion wrappers use
 * transform/scale, which would otherwise create a new containing block).
 *
 * The modal owns its own 15s countdown: the close control is locked (shown
 * as a countdown badge) for the first 15s, then unlocks into a clickable X.
 * It never auto-dismisses on its own - the visitor must close it.
 */
const MacInstructionsModal = ({ open, onClose }: MacInstructionsModalProps) => {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [canClose, setCanClose] = useState(false);

  // Lock body scroll when modal opens
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = ""; // cleanup on unmount
    };
  }, [open]);

  // Countdown that gates the close control - resets each time the modal opens.
  useEffect(() => {
    if (!open) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      setCanClose(false);
      return;
    }
    setSecondsLeft(COUNTDOWN_SECONDS);
    setCanClose(false);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleAttemptClose = () => {
    if (canClose) onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TERMINAL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable - the command is still selectable in the code block */
    }
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mac-instructions-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleAttemptClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(20,18,24,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "8vh",
            padding: 24,
          }}
        >
          <motion.div
            key="mac-instructions-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mac-instructions-heading"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 440,
              background: "#ffffff",
              border: "1px solid rgba(124,58,237,0.12)",
              boxShadow: "0 4px 24px rgba(124,58,237,0.08)",
              borderRadius: 16,
              padding: 28,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {/* Close control - a locked countdown badge for the first 15s, then
                morphs into a clickable X once canClose is true. */}
            <button
              type="button"
              onClick={handleAttemptClose}
              aria-label={canClose ? "Close" : `Closes in ${secondsLeft}s`}
              disabled={!canClose}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(124,58,237,0.1)",
                border: "none",
                borderRadius: canClose ? 8 : "50%",
                color: "#7C3AED",
                fontSize: 12,
                fontWeight: 800,
                cursor: canClose ? "pointer" : "default",
                transition: "background 0.2s, color 0.2s, border-radius 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!canClose) return;
                e.currentTarget.style.background = "rgba(124,58,237,0.18)";
              }}
              onMouseLeave={(e) => {
                if (!canClose) return;
                e.currentTarget.style.background = "rgba(124,58,237,0.1)";
              }}
            >
              {canClose ? <X style={{ width: 15, height: 15 }} /> : secondsLeft}
            </button>

            {/* Heading */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingRight: 28 }}>
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(124,58,237,0.1)",
                  color: "#7C3AED",
                }}
              >
                <AppleGlyph style={{ width: 16, height: 16 }} />
              </span>
              <h2
                id="mac-instructions-heading"
                style={{ fontSize: 18, fontWeight: 800, color: "#2e2d2d", margin: 0, letterSpacing: "-0.01em" }}
              >
                Before you open Juskoe
              </h2>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 5,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  background: "#7C3AED",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                BETA
              </span>
            </div>

            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(46,45,45,0.6)", margin: "0 0 20px" }}>
              Juskoe for Mac is in beta and isn't Apple-notarized yet, so Gatekeeper blocks it on first launch.
              A one-time command fixes that. Follow the steps below in order.
            </p>

            {/* Steps */}
            <ol style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={1} />
                <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, paddingTop: 1 }}>
                  <strong>Download Juskoe</strong> - the Mac .dmg is downloading now in the background.
                </span>
              </li>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={2} />
                <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, paddingTop: 1 }}>
                  <strong>Install Juskoe</strong> - open the .dmg and drag Juskoe into Applications.
                </span>
              </li>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={3} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, display: "block", marginBottom: 8 }}>
                    <strong>Trust Juskoe</strong> - open Terminal and paste this command:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#1a1a1a",
                      borderRadius: 10,
                      padding: "10px 10px 10px 14px",
                    }}
                  >
                    <code
                      style={{
                        flex: 1,
                        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
                        fontSize: 12.5,
                        color: "#e5e5e5",
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {TERMINAL_COMMAND}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Copy command"
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "none",
                        background: copied ? "rgba(5,150,105,0.18)" : "rgba(255,255,255,0.1)",
                        color: copied ? "#34d399" : "#e5e5e5",
                        cursor: "pointer",
                        transition: "background 0.2s, color 0.2s",
                      }}
                    >
                      {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, display: "block", marginTop: 8 }}>
                    Press Enter. No message or error means it worked.
                  </span>
                </div>
              </li>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={4} />
                <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, paddingTop: 1 }}>
                  <strong>Launch Juskoe</strong> - open Applications, then Juskoe. One-time step only.
                </span>
              </li>
            </ol>

            <p style={{ fontSize: 11.5, color: "rgba(46,45,45,0.4)", margin: 0 }}>
              {canClose
                ? "You can close this now."
                : "Your download will start automatically. Read the steps above - you can close this in a few seconds."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

const StepBadge = ({ n }: { n: number }) => (
  <span
    style={{
      flexShrink: 0,
      width: 20,
      height: 20,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(124,58,237,0.1)",
      color: "#7C3AED",
      fontSize: 11,
      fontWeight: 800,
    }}
  >
    {n}
  </span>
);

/** Small Apple glyph used in the heading's accent badge. */
const AppleGlyph = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export default MacInstructionsModal;
