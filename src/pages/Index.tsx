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
