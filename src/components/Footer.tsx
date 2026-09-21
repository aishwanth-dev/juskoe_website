import { motion } from "framer-motion";
import { useState } from "react";
import logo from "@/assets/juskoe-logo.png";
import { Twitter, Mail } from "lucide-react";
import PlatformDownloadButton from "./PlatformDownloadButton";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Modes: [
    { label: "AI Mode (F7)", href: "/modes/ai" },
    { label: "Grammar Mode (F8)", href: "/modes/grammar" },
    { label: "Notes Mode (F9)", href: "/modes/notes" },
    { label: "Rewrite Mode (Select+F7)", href: "/modes/rewrite" },
  ],

  Company: [
    { label: "About", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Mail, href: "mailto:support@Juskoe.app", label: "Email" },
];

/* Letter-by-letter hover glow — NO shine animation */
const GlowLetter = ({ char }: { char: string }) => {
  const [hovered, setHovered] = useState(false);
  const isKoe = "koe.".includes(char);

  return (
    <motion.span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        textShadow: hovered
          ? "0 0 20px rgba(124,58,237,0.8), 0 0 40px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.2)"
          : "0 0 0px transparent",
        color: hovered ? "#7C3AED" : "#2e2d2d",
      }}
      transition={{ duration: 0.25 }}
      style={{
        fontFamily: isKoe
          ? "'Times New Roman', Times, Georgia, serif"
          : "Inter, sans-serif",
        fontStyle: isKoe ? "italic" : "normal",
        fontWeight: isKoe ? 700 : 800,
        cursor: "default",
        display: "inline-block",
      }}
    >
      {char}
    </motion.span>
  );
};

const Footer = () => {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(124,58,237,0.1)",
        padding: "64px 24px",
        backgroundColor: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "32px 40px",
            marginBottom: 48,
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <img src={logo} alt="Juskoe" style={{ height: 28, width: 28 }} />
              <span style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                {"Juskoe.".split("").map((char, i) => (
                  <GlowLetter key={i} char={char} />
                ))}
              </span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(46,45,45,0.5)", maxWidth: 260, lineHeight: 1.6, margin: "0 0 4px" }}>
              A universal voice layer for every app.
            </p>
            <p style={{ fontSize: 12, color: "rgba(46,45,45,0.35)", margin: "0 0 24px" }}>
              Windows & macOS
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PlatformDownloadButton size="footer" />
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#2e2d2d", marginBottom: 16, marginTop: 0 }}>
                {category}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => (
                  <li key={link.label}>
                    <motion.a
                      href={link.href}
                      whileHover={{
                        color: "#7C3AED",
                        textShadow: "0 0 12px rgba(124,58,237,0.3)",
                      }}
                      style={{
                        fontSize: 12,
                        color: "rgba(46,45,45,0.5)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                    >
                      {link.label}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(124,58,237,0.08)",
            paddingTop: 32,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(46,45,45,0.35)", margin: 0 }}>
            © {new Date().getFullYear()} Juskoe. All rights reserved.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                whileHover={{ color: "#7C3AED", scale: 1.15 }}
                style={{ color: "rgba(46,45,45,0.3)", textDecoration: "none" }}
                aria-label={social.label}
              >
                <social.icon style={{ width: 16, height: 16 }} />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
