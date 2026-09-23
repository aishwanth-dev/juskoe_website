import { Helmet } from "react-helmet-async";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AppMarquee from "@/components/AppMarquee";
import CommunityStats from "@/components/CommunityStats";
import { ThreeModes, BuiltForYou } from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";

import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SectionClouds from "@/components/SectionClouds";
import BigJuskoeText from "@/components/BigJuskoeText";
import Pricing from "@/components/Pricing";

/*
  LAYER ORDER (bottom → top):
  1. backgroundColor (purple gradient on sections)
  2. bg-grid tiles (via CSS class) — only on Hero + ThreeModes + CTA + Pricing
  3. Clouds (per-section, scroll-animated, z-2)
  4. Content (z-3)
*/

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://juskoe.in/#organization",
      "name": "Juskoe",
      "url": "https://juskoe.in",
      "description": "Juskoe is a universal voice AI assistant that works system-wide on Windows and macOS. Speak naturally and get polished text in any app — Gmail, VS Code, Slack, Word, and more.",
      "slogan": "Just speak, it happens",
      "foundingDate": "2025",
      "founder": [
        {
          "@type": "Person",
          "name": "Aishwanth M S",
          "jobTitle": "CEO & Founder",
          "email": "aishwanth@juskoe.in",
          "url": "https://www.linkedin.com/in/aishwanth/"
        },
        {
          "@type": "Person",
          "name": "Vishwajeeth Rao B",
          "jobTitle": "Co-Founder",
          "email": "vishwajeeth@juskoe.in",
          "url": "https://www.linkedin.com/in/vishwajeeth-rao-b-7a1764381/"
        }
      ],
      "cto": {
        "@type": "Person",
        "name": "Govind D S",
        "jobTitle": "CTO",
        "email": "govind@juskoe.in",
        "url": "https://www.linkedin.com/in/govind-ds-16280135/"
      },
      "sameAs": [
        "https://juskoe.in",
        "https://www.linkedin.com/company/Juskoe"
      ],
      "logo": "https://juskoe.in/juskoe-logo.png",
      "foundingLocation": { "@type": "Place", "name": "India" }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://juskoe.in/#software",
      "name": "Juskoe",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Windows, macOS",
      "description": "Juskoe is a system-wide AI voice dictation and voice-to-text desktop application. Speak naturally in any app on Windows or macOS and get polished, formatted text at your cursor — with AI Mode, Grammar Mode, Notes Mode, and Rewrite Mode.",
      "url": "https://juskoe.in",
      "image": "https://juskoe.in/juskoe-logo.png",
      "author": { "@id": "https://juskoe.in/#organization" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Plan",
          "price": "0",
          "priceCurrency": "USD",
          "description": "25 uses/day (10 AI Mode, 15 Grammar Mode), 200 uses/month combined, local dictionary, snippets, and notes. No cloud sync."
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "10",
          "priceCurrency": "USD",
          "priceValidUntil": "2026-12-31",
          "description": "Unlimited AI Mode and Grammar Mode usage, cloud sync across devices, priority processing, and advanced prompt generation. $10/month or $8/month billed annually."
        }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://juskoe.in/#webpage",
      "name": "Juskoe — AI Voice Dictation & Voice-to-Text for Windows and macOS",
      "description": "Juskoe is a system-wide voice AI assistant. Speak naturally and get polished text in any app on Windows or macOS. Free to start.",
      "isPartOf": { "@id": "https://juskoe.in/#website" },
      "about": { "@id": "https://juskoe.in/#software" }
    },
    {
      "@type": "FAQPage",
      "@id": "https://juskoe.in/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Juskoe?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Juskoe is a system-wide AI voice dictation and voice-to-text software application for Windows and macOS. It is not related to the Filipino slang expression \"jusko\"/\"juskoe\" (from \"Diyos ko\", meaning \"my God\"). Juskoe lets you speak naturally in any desktop application and converts your speech into polished, formatted text at your cursor."
          }
        },
        {
          "@type": "Question",
          "name": "Is Juskoe free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Juskoe's Free plan includes 25 uses per day (10 AI Mode, 15 Grammar Mode) with no credit card required. The Pro plan is $10/month (or $8/month billed annually) and adds unlimited usage and cloud sync."
          }
        },
        {
          "@type": "Question",
          "name": "What platforms does Juskoe support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Juskoe runs on Windows 10 and later, and macOS 12 and later."
          }
        }
      ]
    }
  ]
};

const Index = () => {
  return (
    <SmoothScroll>
      <Helmet>
        <title>Juskoe — AI Voice Dictation & Voice-to-Text for Windows & macOS</title>
        <meta name="description" content="Juskoe is a system-wide voice AI assistant for Windows and macOS. Speak naturally, get polished text in any app. Free to start — AI dictation, grammar cleanup, and voice notes." />
        <meta name="keywords" content="Juskoe, voice AI, voice to text, AI dictation, speech to text, voice assistant, dictation software, system-wide dictation, Windows voice typing, macOS dictation, free voice to text" />
        <meta name="author" content="Juskoe — 16xStudios" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />

        <meta property="og:title" content="Juskoe — AI Voice Dictation & Voice-to-Text for Windows & macOS" />
        <meta property="og:description" content="Speak naturally, get polished text anywhere. Juskoe is a universal voice AI layer for your OS — free to start, works in every app." />
        <meta property="og:url" content="https://juskoe.in" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Juskoe" />
        <meta property="og:image" content="https://juskoe.in/juskoe-logo.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@Juskoe" />
        <meta name="twitter:title" content="Juskoe — AI Voice Dictation & Voice-to-Text for Windows & macOS" />
        <meta name="twitter:description" content="Juskoe puts voice AI in every app. System-wide dictation for Windows and macOS — free, fast, and intelligent." />
        <meta name="twitter:image" content="https://juskoe.in/juskoe-logo.png" />

        <link rel="canonical" href="https://juskoe.in" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="min-h-screen">
        <Navbar />

        {/* Crawlable product summary — visually hidden from sighted users (the
            animated sections below convey this visually), but present as real
            semantic HTML for search engines, AI crawlers, and screen readers.
            Do NOT use display:none or visibility:hidden — those are sometimes
            discounted by crawlers/accessibility tools. This uses the standard
            "visually hidden" pattern (clipped, off-screen, but in the accessibility
            tree and DOM). */}
        <section
          aria-hidden="false"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <h2>Juskoe — AI Voice Dictation and Voice-to-Text for Windows and macOS</h2>
          <p>
            Juskoe is a system-wide AI voice dictation and voice-to-text desktop application for
            Windows and macOS, built by 16xStudios. It is not related to the Filipino/Tagalog slang
            expression "jusko" or "juskoe" (short for "Diyos ko", meaning "my God"). Juskoe lets you
            press a hotkey, speak naturally in any application, and get polished, formatted text
            pasted directly at your cursor.
          </p>

          <h2>AI Mode (hotkey F7)</h2>
          <p>
            AI Mode is Juskoe's most powerful mode. Speak your intent naturally — for example, "write
            a professional email to the team about the Q4 results" or "give me a prompt to build a
            to-do app" — and Juskoe transcribes your speech, sends it to an AI engine for smart
            formatting and generation, and pastes the fully polished output directly at your cursor.
            AI Mode is used for drafting emails, messages, code snippets, prompts, and structured
            plans.
          </p>

          <h2>Grammar Mode (hotkey F8)</h2>
          <p>
            Grammar Mode lets you speak naturally, filler words and all — "umm", "uhh", pauses,
            self-corrections — and Juskoe outputs clean, grammatically correct text with fixed
            spelling, punctuation, and capitalization. It is Juskoe's fast, accurate voice-to-text
            dictation mode for everyday writing.
          </p>

          <h2>Notes Mode (hotkey F9)</h2>
          <p>
            Notes Mode is Juskoe's voice notes app. Speak freely to capture ideas, to-do lists, or
            meeting notes, and Juskoe formats your speech into readable notes saved to a local notes
            library. Pro users get cloud sync so notes are available across devices.
          </p>

          <h2>Rewrite Mode (select text, then F7)</h2>
          <p>
            Rewrite Mode transforms existing text by voice. Select any text in any application, press
            F7, and speak an instruction such as "make this more professional", "translate to
            Spanish", or "summarize in 3 bullets" — Juskoe rewrites the selected text in place
            according to your spoken instruction.
          </p>

          <h2>Key Features</h2>
          <p>
            Juskoe works system-wide across any application on Windows and macOS — email clients,
            code editors, chat apps, word processors, and browsers. It includes custom dictionaries
            for names and jargon, reusable text snippets, a local notes library, app-aware formatting
            that adapts output style to the target application, and multi-language speech
            recognition. Pro users additionally get cloud sync of their dictionary, snippets, notes,
            and settings across devices.
          </p>

          <h2>Pricing</h2>
          <p>
            Juskoe's Free plan costs $0 forever, with no credit card required. It includes 25 uses
            per day (10 AI Mode uses via F7, 15 Grammar Mode uses via F8), 200 combined uses per
            month, local dictionary, local snippets, local notes, and app-aware formatting, with no
            cloud sync. Juskoe Pro costs $10 per month, or $8 per month billed annually, and includes
            unlimited AI Mode and Grammar Mode usage, longer and more detailed outputs, priority
            processing, cloud sync across devices, higher-quality rewrites, advanced prompt
            generation, and early access to new features.
          </p>

          <h2>Supported Platforms</h2>
          <p>Juskoe runs on Windows 10 and later, and macOS 12 and later.</p>
        </section>

        {/* Hero — tiles + purple bg + clouds */}
        <section className="bg-grid" style={{ backgroundColor: "#ede9fe" }}>
          <SectionClouds variant="hero">
            <Hero />
          </SectionClouds>
        </section>

        <AppMarquee />

        {/* Live community counter (members + pro members) */}
        <CommunityStats />

        {/* Three Modes — WITH tiles + clouds (dark bg) */}
        <section className="bg-grid" style={{ backgroundColor: "#0f0520" }}>
          <SectionClouds variant="features" cloudsAbove>
            <ThreeModes />
          </SectionClouds>
        </section>

        {/* Pricing — tiles + light purple bg */}
        <section style={{ backgroundColor: "#faf5ff" }}>
          <Pricing />
        </section>

        {/* Built For You — no clouds */}
        <section style={{ backgroundColor: "#f5f3ff" }}>
          <BuiltForYou />
        </section>

        {/* How It Works — plain white */}
        <section style={{ backgroundColor: "#ffffff" }}>
          <HowItWorks />
        </section>



        {/* Testimonials */}
        <section style={{ backgroundColor: "#faf9ff" }}>
          <Testimonials />
        </section>

        {/* CTA — tiles + purple bg + clouds */}
        <section className="bg-grid" style={{ backgroundColor: "#ede9fe" }}>
          <SectionClouds variant="cta">
            <CTA />
          </SectionClouds>
        </section>

        {/* Big Juskoe text */}
        <section style={{ backgroundColor: "#faf9ff" }}>
          <BigJuskoeText />
        </section>

        <Footer />
      </div>
    </SmoothScroll>
  );
};

export default Index;
