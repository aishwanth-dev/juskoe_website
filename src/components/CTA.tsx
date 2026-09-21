import { motion } from "framer-motion";
import ShinyText from "./ShinyText";
import BlurText from "./BlurText";
import PlatformDownloadButton from "./PlatformDownloadButton";

const CTA = () => {
  return (
    <section id="cta" className="py-32 md:py-40 px-6 relative overflow-hidden">
      {/* Purple blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgba(124,58,237,0.07)] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[rgba(124,58,237,0.05)] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 max-w-3xl mx-auto text-center"
      >
        <div className="flex justify-center mb-6">
          <span className="badge-purple">Start today — free</span>
        </div>

        <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 text-[#2e2d2d]">
          Start
          <br />
          <span className="font-serif-italic italic-shine">
            <ShinyText text="speaking." speed={4} color="#2e2d2d" shineColor="#7C3AED" />
          </span>
        </h2>

        <div className="flex justify-center mb-8 mt-4">
          <BlurText
            text="Download Juskoe and experience voice-first productivity. Works on Windows and Mac."
            delay={50}
            className="text-[#2e2d2d]/55 text-lg max-w-xl justify-center"
            direction="bottom"
            stepDuration={0.25}
          />
        </div>

        {/* Rectangle Framer-style buttons */}
        <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <PlatformDownloadButton size="cta" />
        </motion.div>

        <p className="text-xs text-[#2e2d2d]/35">
          Free during early access · No credit card required · Windows 10+ & macOS 12+
        </p>
      </motion.div>
    </section>
  );
};

export default CTA;
