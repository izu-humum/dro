"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet/context";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FINAL = ["D", "R", "O"];
const CYBER_COLORS = ["text-neon-cyan", "text-neon-green", "text-accent-bright", "text-neon-blue", "text-neon-pink"];
const HOVER_COLORS = ["text-neon-cyan", "text-neon-green", "text-accent-bright"];

function DroLogo() {
  const [chars, setChars] = useState(["0", "0", "0"]);
  const [colorIdx, setColorIdx] = useState([0, 2, 4]);
  const [resolved, setResolved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const offsets = [
    { x: useMotionValue(0), y: useMotionValue(0) },
    { x: useMotionValue(0), y: useMotionValue(0) },
    { x: useMotionValue(0), y: useMotionValue(0) },
  ];

  const springs = offsets.map((o) => ({
    x: useSpring(o.x, { stiffness: 300, damping: 20, mass: 0.5 }),
    y: useSpring(o.y, { stiffness: 300, damping: 20, mass: 0.5 }),
  }));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const scrambleDuration = 1800;
    const interval = 60;
    const steps = scrambleDuration / interval;

    for (let step = 0; step < steps; step++) {
      timers.push(
        setTimeout(() => {
          setChars((prev) =>
            prev.map((_, i) => {
              const resolveAt = steps - 8 + i * 4;
              if (step >= resolveAt) return FINAL[i];
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
          );
          setColorIdx((prev) => prev.map((c, i) => (c + 1 + i) % CYBER_COLORS.length));
        }, 2800 + step * interval)
      );
    }

    timers.push(setTimeout(() => {
      setChars([...FINAL]);
      setResolved(true);
    }, 2800 + scrambleDuration + 100));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!resolved || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const lr = el.getBoundingClientRect();
        const lx = lr.left + lr.width / 2 - rect.left;
        const ly = lr.top + lr.height / 2 - rect.top;
        const dx = lx - cx;
        const dy = ly - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = Math.max(0, 1 - dist / 80);
        const push = force * force * 18;
        const angle = Math.atan2(dy, dx);
        offsets[i].x.set(Math.cos(angle) * push);
        offsets[i].y.set(Math.sin(angle) * push);
      });
    },
    [resolved, offsets]
  );

  const [hovered, setHovered] = useState(false);

  const handleMouseLeave = useCallback(() => {
    offsets.forEach((o) => {
      o.x.set(0);
      o.y.set(0);
    });
    setHovered(false);
  }, [offsets]);

  const isScrambling = !resolved;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-default select-none"
    >
      <div className="relative flex items-center gap-[2px]">
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            ref={(el) => { letterRefs.current[i] = el; }}
            style={{ x: springs[i].x, y: springs[i].y }}
            className={`inline-block text-[18px] font-sans font-bold tracking-[-0.04em] will-change-transform transition-colors duration-200 ${
              isScrambling ? CYBER_COLORS[colorIdx[i]] : hovered ? HOVER_COLORS[i] : "text-white"
            }`}
          >
            {ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const { connected, shortAddress, tokens, openModal } = useWallet();

  // Find CELO balance from tokens
  const celoToken = tokens.find((t) => t.symbol === "CELO");
  const celoBalance = celoToken ? parseFloat(celoToken.balance) : 0;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 2.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between relative">
        {/* Logo */}
        <Link href="/" className="pointer-events-auto cursor-default">
          <DroLogo />
        </Link>

        {/* Right nav */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/dashboard"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/80 hover:text-white transition-colors duration-300"
          >
            Dashboard
          </Link>
          <Link
            href="/tracking"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/80 hover:text-white transition-colors duration-300"
          >
            Orders
          </Link>
          <Link
            href="/history"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/80 hover:text-white transition-colors duration-300"
          >
            History
          </Link>
          <Link
            href="/admin"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/60 hover:text-white transition-colors duration-300"
          >
            Admin
          </Link>

          {/* Connect Wallet Button */}
          <button
            onClick={openModal}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-[13px] font-mono transition-all duration-300 ${
              connected
                ? "bg-[#FCFF52]/5 border border-[#FCFF52]/20 text-[#FCFF52] hover:bg-[#FCFF52]/10"
                : "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-accent/25 text-accent hover:border-accent/40 hover:shadow-[0_0_30px_rgba(206,202,251,0.15)]"
            }`}
          >
            {connected ? (
              <>
                <img src="/tokens/celo.svg" alt="Celo" className="w-5 h-5" />
                <span>{shortAddress}</span>
                {celoBalance > 0 && (
                  <span className="text-[11px] text-white/60 ml-1">
                    {celoBalance.toFixed(2)} CELO
                  </span>
                )}
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
