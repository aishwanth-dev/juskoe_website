import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";

const TERMINAL_COMMAND = "xattr -cr /Applications/Juskoe.app";

interface MacInstructionsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * One-time Gatekeeper workaround shown right after a Mac download starts.
 *
 * The parent (PlatformDownloadButton) owns the open state and the 15s
 * auto-dismiss timer — this component only renders and lets the visitor close
 * early via the X button or the backdrop.
 */
const MacInstructionsModal = ({ open, onClose }: MacInstructionsModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TERMINAL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the command is still selectable in the code block */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mac-instructions-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(20,18,24,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              maxWidth: 420,
              background: "#ffffff",
              border: "1px solid rgba(124,58,237,0.12)",
              boxShadow: "0 4px 24px rgba(124,58,237,0.08)",
              borderRadius: 16,
              padding: 28,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {/* Close button — always visible, not gated behind the auto-dismiss timer */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(46,45,45,0.06)",
                border: "none",
                borderRadius: 8,
                color: "rgba(46,45,45,0.55)",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(124,58,237,0.1)";
                e.currentTarget.style.color = "#7C3AED";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(46,45,45,0.06)";
                e.currentTarget.style.color = "rgba(46,45,45,0.55)";
              }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>

            {/* Heading */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingRight: 28 }}>
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
              Juskoe for Mac is in beta and isn't Apple-notarized yet, so macOS Gatekeeper blocks it the first
              time you open it. Running this command once tells your Mac to trust it — you won't need to do it
              again.
            </p>

            {/* Steps */}
            <ol style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={1} />
                <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, paddingTop: 1 }}>
                  Open <strong>Terminal</strong> — press <code style={inlineCodeStyle}>Cmd + Space</code>, type
                  "Terminal", then press Enter.
                </span>
              </li>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={2} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, display: "block", marginBottom: 8 }}>
                    Paste this command and press Enter:
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
                </div>
              </li>
              <li style={{ display: "flex", gap: 10 }}>
                <StepBadge n={3} />
                <span style={{ fontSize: 13.5, color: "#2e2d2d", lineHeight: 1.5, paddingTop: 1 }}>
                  Open <strong>Juskoe</strong> from Applications or Launchpad. That's it — one-time only.
                </span>
              </li>
            </ol>

            <p style={{ fontSize: 11.5, color: "rgba(46,45,45,0.4)", margin: 0 }}>
              This closes automatically in a few seconds, or tap the X anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const inlineCodeStyle: React.CSSProperties = {
  fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
  fontSize: 12,
  background: "rgba(46,45,45,0.08)",
  padding: "1px 5px",
  borderRadius: 4,
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

export default MacInstructionsModal;
