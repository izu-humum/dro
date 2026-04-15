"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("dro-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("dro-cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("dro-cookie-consent", "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[9999]"
        >
          <div className="glass-strong p-5 rounded-2xl border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/12 border border-neon-cyan/25 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-accent-bright" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-sans font-medium text-white mb-1">
                  We use cookies
                </p>
                <p className="text-[12px] font-mono text-white/50 leading-relaxed mb-4">
                  We use cookies to enhance your experience, analyze traffic, and personalize content. By continuing, you agree to our use of cookies.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={accept}
                    className="px-4 py-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/35 text-[12px] font-mono text-accent-bright hover:bg-neon-cyan/30 transition-all duration-300"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={decline}
                    className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] font-mono text-white/50 hover:text-white/70 hover:border-white/15 transition-all duration-300"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button
                onClick={decline}
                className="text-white/40 hover:text-white/50 transition-colors duration-300 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
