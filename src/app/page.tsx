"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Shield,
  Zap,
  Lock,
  Clock,
  CheckCircle2,
  Bot,
  Globe,
  CreditCard,
  Wallet,
  Package,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import LoadingScreen from "@/components/LoadingScreen";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import LiveStats from "@/components/LiveStats";

const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });

const comparisonData = [
  { feature: "Price Comparison", dro: "AI-Powered", others: "Manual" },
  { feature: "Sources", dro: "10+ Platforms", others: "1 Platform" },
  { feature: "Payment Protection", dro: "Smart Contract Escrow", others: "Trust-Based" },
  { feature: "Purchase", dro: "Automated Agent", others: "You Buy Manually" },
  { feature: "Tracking", dro: "Real-Time Updates", others: "Check Yourself" },
  { feature: "Disputes", dro: "Auto-Refund 14 Days", others: "Weeks of Emails" },
];

const howItWorks = [
  {
    icon: <Search className="w-6 h-6" />,
    title: "Describe What You Want",
    desc: "Type naturally. Our AI understands context, budget, and preferences.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Agents Search Everywhere",
    desc: "9 specialized agents scan Amazon, Steam, eBay, and 10+ sources in parallel.",
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: "Compare & Choose",
    desc: "Results ranked by price, seller trust, and delivery speed with price history.",
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: "Pay With Escrow Protection",
    desc: "Fiat or crypto. Funds held in smart contract until delivery is confirmed.",
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: "We Buy For You",
    desc: "Our purchase agent handles checkout, shipping, and Steam trades automatically.",
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Confirm & Release",
    desc: "Confirm delivery to release escrow. Auto-refund if undelivered in 14 days.",
  },
];

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScroll = useCallback((progress: number) => {
    setScrollProgress(progress);
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Typewriter
  const [placeholder, setPlaceholder] = useState("");
  const suggestions = [
    "Find the best deal on a CS2 AWP Asiimov",
    "Find the cheapest RTX 4070",
    "AWP Dragon Lore Factory New",
    "Nike Dunk Low Panda size 10",
  ];
  const [suggIdx, setSuggIdx] = useState(0);

  useEffect(() => {
    const current = suggestions[suggIdx];
    let charIdx = 0;
    let deleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      if (!deleting) {
        setPlaceholder(current.slice(0, charIdx + 1));
        charIdx++;
        if (charIdx === current.length) {
          timeout = setTimeout(() => { deleting = true; type(); }, 2500);
          return;
        }
        timeout = setTimeout(type, 45 + Math.random() * 25);
      } else {
        setPlaceholder(current.slice(0, charIdx));
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          setSuggIdx((p) => (p + 1) % suggestions.length);
          return;
        }
        timeout = setTimeout(type, 20);
      }
    };

    timeout = setTimeout(type, 600);
    return () => clearTimeout(timeout);
  }, [suggIdx]);

  return (
    <>
      <LoadingScreen />

      {/* 3D Canvas - fixed behind everything */}
      <Scene3D scrollProgress={scrollProgress} />

      {/* Noise + Hue overlays */}
      <div className="noise-overlay" />
      <div className="hue-overlay" />

      {/* Navbar */}
      <Navbar />

      {/* Scrollable content */}
      <SmoothScroll onScrollProgress={handleScroll}>
        <div className="content-layer">

          {/* ═══════════════ HERO SECTION ═══════════════ */}
          <section className="min-h-[120vh] flex flex-col items-center justify-center px-6 relative">
            {/* Label pinned below navbar, above the ring */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.6, ease: [0.16, 1, 0.3, 1] }}
              className="label-text tracking-[0.15em] absolute top-[200px]"
            >
              AI-POWERED PROXY MARKETPLACE
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 2.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-4xl mx-auto content-backdrop"
            >
              <h1 className="heading-hero mb-8">
                Shop Anything.{" "}
                <br className="hidden md:block" />
                From <span className="accent-value text-glow">Anywhere.</span>
              </h1>
              <p className="body-text max-w-xl mx-auto mb-12">
                AI agents search 10+ platforms, compare prices, and buy products
                for you — protected by{" "}
                <span className="relative inline-block group cursor-help">
                  <span className="accent-value">
                    smart contract escrow
                  </span>
                  <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 rounded-xl bg-[#141022] border border-white/10 text-[12px] font-mono text-white/70 leading-relaxed text-left shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-50">
                    Your payment is held in a secure smart contract — not by us. Funds are only released to the seller once you confirm delivery. If undelivered within 14 days, you're automatically refunded.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#141022]" />
                  </span>
                </span>.
              </p>

              {/* Search bar */}
              <div className="max-w-2xl mx-auto">
                <div className="glass-strong p-2 rounded-2xl">
                  <div className="flex items-center">
                    <div className="pl-4 pr-3">
                      <Search className="w-5 h-5 text-white/50" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder={placeholder || "What are you looking for?"}
                      className="flex-1 bg-transparent py-4 text-[16px] text-white placeholder:text-white/45 focus:outline-none font-mono"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSearch}
                      className="mr-1 w-12 h-12 rounded-xl bg-neon-cyan/20 border border-neon-cyan/35 flex items-center justify-center text-accent-bright hover:bg-neon-cyan/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(91,184,196,0.35)]"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                {/* Search quality hint */}
                <SearchHint query={query} />
              </div>
            </motion.div>

            {/* Scroll hint — subtle arrow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              transition={{ delay: 4, duration: 1 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2"
            >
              <motion.svg
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                width="20" height="20" viewBox="0 0 20 20" fill="none"
              >
                <path d="M4 8L10 14L16 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </motion.div>
          </section>

          {/* ═══════════════ STATS ═══════════════ */}
          <section className="py-32 md:py-40 px-6 md:px-10">
            <div className="max-w-[1200px] mx-auto section-glass">
              <LiveStats />
            </div>
          </section>

          <div className="section-spacer-md" />

          {/* ═══════════════ COMPARISON TABLE ═══════════════ */}
          <section className="section-full">
            <div className="max-w-[1000px] mx-auto w-full section-glass">
              <ScrollReveal>
                <p className="label-text mb-6 tracking-[0.15em]">
                  WHY DRO
                </p>
                <h2 className="heading-section mb-16">
                  Built Different.
                </h2>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-0">
                {/* Header row */}
                <ScrollReveal delay={0.1}>
                  <div className="py-4 px-2">
                    <p className="label-text">Feature</p>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.15}>
                  <div className="py-4 px-2 text-center">
                    <p className="label-text accent-value">DRO</p>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.2}>
                  <div className="py-4 px-2 text-center">
                    <p className="label-text">Others</p>
                  </div>
                </ScrollReveal>

                {/* Rows */}
                {comparisonData.map((row, i) => (
                  <ComparisonRow key={row.feature} row={row} index={i} />
                ))}
              </div>
            </div>
          </section>

          <div className="section-spacer-lg" />

          {/* ═══════════════ BUILT FOR TRUST ═══════════════ */}
          <section className="section-full items-center text-center section-glass">
            <ScrollReveal>
              <h2 className="heading-large mb-10">
                Built For{" "}
                <span className="accent-value text-glow">Trust</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="body-text max-w-lg mx-auto mb-16">
                Every transaction is protected by smart contract escrow.
                No trust required — only verification.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <ScrollReveal delay={0.15}>
                <TrustBadge
                  icon={<ShieldCheck className="w-6 h-6" />}
                  title="Escrow Protected"
                  desc="Funds locked until delivery"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.25}>
                <TrustBadge
                  icon={<Clock className="w-6 h-6" />}
                  title="14-Day Guarantee"
                  desc="Auto-refund if undelivered"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.35}>
                <TrustBadge
                  icon={<Shield className="w-6 h-6" />}
                  title="On-Chain Proof"
                  desc="Every transaction verifiable"
                />
              </ScrollReveal>
            </div>
          </section>

          <div className="section-spacer-md" />

          {/* ═══════════════ HOW IT WORKS ═══════════════ */}
          <section className="py-32 md:py-40 px-6 md:px-10">
            <div className="max-w-[1000px] mx-auto section-glass">
              <ScrollReveal>
                <p className="label-text mb-6 tracking-[0.15em]">HOW IT WORKS</p>
                <h2 className="heading-section mb-20">
                  Six Steps.{" "}
                  <span className="accent-value">Zero Effort.</span>
                </h2>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {howItWorks.map((step, i) => (
                  <ScrollReveal key={step.title} delay={i * 0.1}>
                    <div className="glass p-8 rounded-2xl h-full group hover:bg-glass-hover transition-all duration-500 hover:shadow-[0_4px_40px_rgba(91,184,196,0.10)]">
                      <div className="w-12 h-12 rounded-xl bg-neon-cyan/12 border border-neon-cyan/25 flex items-center justify-center text-accent-bright mb-5 group-hover:bg-neon-cyan/22 transition-colors duration-500">
                        {step.icon}
                      </div>
                      <h3 className="text-[16px] font-sans font-medium text-white mb-3 tracking-[-0.01em]">
                        {step.title}
                      </h3>
                      <p className="text-[14px] font-mono text-white/55 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          <div className="section-spacer-md" />

          {/* ═══════════════ PAYMENT METHODS ═══════════════ */}
          <section className="section-full items-center text-center section-glass">
            <ScrollReveal>
              <p className="label-text mb-6 tracking-[0.15em]">PAYMENTS</p>
              <h2 className="heading-section mb-8">
                Pay Your Way
              </h2>
              <p className="body-text max-w-lg mx-auto mb-16">
                Card, bank transfer, or crypto wallet. 1% protocol + 1% platform fee.
                That&apos;s it.
              </p>
            </ScrollReveal>

            <div className="flex flex-col sm:flex-row gap-6 max-w-xl mx-auto">
              <ScrollReveal delay={0.1} className="flex-1">
                <div className="glass p-8 rounded-2xl text-center h-full hover:shadow-[0_4px_40px_rgba(206,202,251,0.08)] transition-all duration-500">
                  <CreditCard className="w-8 h-8 text-accent mx-auto mb-4" />
                  <h3 className="text-[15px] font-sans font-medium text-white mb-2">
                    Fiat
                  </h3>
                  <p className="text-[13px] font-mono text-white/55">
                    Visa, Mastercard, Bank via Stripe
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2} className="flex-1">
                <div className="glass p-8 rounded-2xl text-center h-full hover:shadow-[0_4px_40px_rgba(206,202,251,0.08)] transition-all duration-500">
                  <Wallet className="w-8 h-8 text-accent mx-auto mb-4" />
                  <h3 className="text-[15px] font-sans font-medium text-white mb-2">
                    Crypto
                  </h3>
                  <p className="text-[13px] font-mono text-white/55">
                    USDC via WalletConnect
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </section>

          <div className="section-spacer-lg" />

          {/* ═══════════════ CTA FOOTER ═══════════════ */}
          <section className="section-full items-center text-center section-glass">
            <ScrollReveal>
              <h2 className="heading-large mb-10">
                Start{" "}
                <span className="accent-value text-glow">Shopping</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p className="body-text max-w-md mx-auto mb-12">
                Let AI do the searching, comparing, and buying.
                You just tell us what you want.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => inputRef.current?.focus(), 800);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Let's Buy
                </button>
                <button
                  onClick={() => router.push("/results?q=trending")}
                  className="btn-secondary flex items-center gap-2"
                >
                  Explore
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══════════════ FOOTER ═══════════════ */}
          <footer className="py-20 px-6 md:px-10 border-t border-white/[0.08] bg-[#0d0a18]/80 backdrop-blur-xl">
            <div className="max-w-[1200px] mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan/30 to-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-accent-bright" />
                  </div>
                  <span className="text-[16px] font-sans font-semibold text-white tracking-[-0.02em]">
                    DRO
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <a
                    href="#"
                    className="text-[13px] font-mono text-white/60 hover:text-accent-bright transition-colors duration-300 tracking-wider"
                  >
                    DOCS
                  </a>
                  <a
                    href="#"
                    className="text-[13px] font-mono text-white/60 hover:text-accent-bright transition-colors duration-300 tracking-wider"
                  >
                    PRIVACY
                  </a>
                  <a
                    href="#"
                    className="text-[13px] font-mono text-white/60 hover:text-accent-bright transition-colors duration-300 tracking-wider"
                  >
                    TERMS
                  </a>
                </div>
              </div>
              <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[12px] font-mono text-white/40">
                  &copy; 2026 Dro Protocol. All rights reserved.
                </p>
                <p className="text-[11px] font-mono text-white/40">
                  Built with AI. Protected by smart contracts.
                </p>
              </div>
            </div>
          </footer>

        </div>
      </SmoothScroll>
    </>
  );
}

function ComparisonRow({
  row,
  index,
}: {
  row: { feature: string; dro: string; others: string };
  index: number;
}) {
  return (
    <>
      <ScrollReveal delay={0.1 + index * 0.05}>
        <div className="py-5 px-3 border-t border-dashed border-border-dashed">
          <p className="text-[14px] font-mono text-white/70">{row.feature}</p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.15 + index * 0.05}>
        <div className="py-5 px-3 text-center border-t border-dashed border-border-dashed">
          <p className="text-[14px] font-mono accent-value font-semibold">
            {row.dro}
          </p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.2 + index * 0.05}>
        <div className="py-5 px-3 text-center border-t border-dashed border-border-dashed">
          <p className="text-[14px] font-mono text-white/50">{row.others}</p>
        </div>
      </ScrollReveal>
    </>
  );
}

function TrustBadge({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass p-8 rounded-2xl text-center hover:shadow-[0_4px_40px_rgba(139,92,246,0.15)] transition-all duration-500 group">
      <div className="w-14 h-14 rounded-2xl bg-neon-cyan/12 border border-neon-cyan/25 flex items-center justify-center text-accent-bright mx-auto mb-4 group-hover:bg-neon-cyan/22 transition-colors duration-500">
        {icon}
      </div>
      <h3 className="text-[16px] font-sans font-medium text-white mb-2">
        {title}
      </h3>
      <p className="text-[13px] font-mono text-white/50">{desc}</p>
    </div>
  );
}

function SearchHint({ query }: { query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const count = words.length;

  if (query.length === 0) return null;

  const hint = (() => {
    if (count === 1 && query.length <= 5) {
      return { level: "weak", text: "Too vague — try 2-3 words like \"power bank\" or \"Nike shoes\"", color: "text-red-400/60" };
    }
    if (count === 1) {
      return { level: "ok", text: "Add a brand or type for better results — e.g. \"wireless mouse\"", color: "text-warning/60" };
    }
    if (count === 2) {
      return { level: "good", text: "Good query — add size, color, or model for even better results", color: "text-neon-green/50" };
    }
    return { level: "great", text: "Great — specific queries get the best results", color: "text-neon-green/60" };
  })();

  return (
    <AnimatePresence>
      <motion.div
        key={hint.level}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mt-3 px-2"
      >
        <p className={`text-[11px] font-mono ${hint.color}`}>
          {hint.text}
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                (count >= 3 && i <= 3) || (count === 2 && i <= 2) || (count === 1 && query.length > 5 && i <= 1)
                  ? i <= 1 ? "bg-warning" : "bg-neon-green/70"
                  : count === 1 && query.length <= 5
                    ? "bg-red-400/30"
                    : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
