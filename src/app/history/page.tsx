"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Rocket,
  ShoppingBag,
  Wallet,
  CreditCard,
  ExternalLink,
  Clock,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getHistory, type HistoryEntry } from "@/lib/history";

type FilterType = "all" | "purchase" | "pledge";

function RelativeTime({ ts }: { ts: number }) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>Just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  if (days < 30) return <span>{days}d ago</span>;
  return (
    <span>
      {new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
    </span>
  );
}

function getEntryLink(entry: HistoryEntry): string | null {
  if (entry.type === "pledge" && entry.campaignId) {
    return `https://app-dev.oaknetwork.org/backer/projects/${entry.campaignId}`;
  }
  if (entry.paymentMethod === "crypto" && entry.txHashes) {
    const txHash = entry.txHashes.fund || entry.txHashes.escrow || entry.txHashes.approve;
    if (txHash) return `https://sepolia.celoscan.io/tx/${txHash}`;
  }
  return null;
}

function EntryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const isPledge = entry.type === "pledge";
  const externalLink = getEntryLink(entry);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.04,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative group transition-all duration-500 hover:scale-[1.02]"
    >
      {/* Drawer — slides out from behind the tile on hover */}
      {externalLink && (
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0 right-0 h-full w-12 bg-accent/8 rounded-r-2xl flex items-center justify-center pl-2 text-accent/50 hover:text-white hover:bg-accent/15 translate-x-0 group-hover:translate-x-[calc(100%-16px)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-0"
        >
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200" />
        </a>
      )}

      {/* Main tile — sits on top of the drawer */}
      <div className="relative z-10 glass rounded-2xl overflow-hidden group-hover:bg-glass-hover transition-all duration-500">
        <div className="flex items-stretch">
          {/* Left accent bar */}
          <div
            className={`w-1 flex-shrink-0 ${
              isPledge
                ? "bg-gradient-to-b from-neon-green/60 to-neon-green/10"
                : "bg-gradient-to-b from-accent/60 to-accent/10"
            }`}
          />

          <div className="flex-1 p-4 flex items-center gap-4">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPledge
                  ? "bg-neon-green/10 border border-neon-green/20"
                  : "bg-accent/10 border border-accent/20"
              }`}
            >
              {isPledge ? (
                <Rocket className="w-4 h-4 text-neon-green" />
              ) : (
                <ShoppingBag className="w-4 h-4 text-accent" />
              )}
            </div>

            {/* Image (if available) */}
            {entry.image && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2">
                <img
                  src={entry.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                    isPledge
                      ? "bg-neon-green/10 text-neon-green/70"
                      : "bg-accent/10 text-accent/70"
                  }`}
                >
                  {isPledge ? "PLEDGE" : "PURCHASE"}
                </span>
                <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <RelativeTime ts={entry.timestamp} />
                </span>
              </div>
              <h4 className="text-[13px] font-sans font-medium text-white/90 truncate">
                {entry.title}
              </h4>
              <p className="text-[11px] font-mono text-white/50 truncate">
                {entry.subtitle || entry.source}
              </p>
            </div>

            {/* Amount + payment */}
            <div className="text-right flex-shrink-0">
              <p className="text-[15px] font-mono font-bold text-white">
                ${entry.amount.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                {entry.paymentMethod === "crypto" ? (
                  <Wallet className="w-3 h-3 text-accent/50" />
                ) : (
                  <CreditCard className="w-3 h-3 text-accent/50" />
                )}
                <span className="text-[10px] font-mono text-white/40">
                  {entry.paymentMethod === "crypto"
                    ? entry.currency
                    : "Card"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryContent() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(getHistory());
    setLoaded(true);
  }, []);

  const filtered = entries.filter(
    (e) => filter === "all" || e.type === filter,
  );

  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0);
  const pledgeCount = entries.filter((e) => e.type === "pledge").length;
  const purchaseCount = entries.filter((e) => e.type === "purchase").length;

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="hue-overlay" />
      <Navbar />

      <main className="relative z-10 pt-28 pb-16 px-6 max-w-[800px] mx-auto">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[13px] font-mono text-white/45 hover:text-white transition-colors duration-300 mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <p className="text-[11px] font-mono tracking-[0.15em] text-accent/50 mb-3">
            ACTIVITY
          </p>
          <h1 className="text-[clamp(24px,3dvw,36px)] font-sans font-semibold tracking-[-0.02em] text-white">
            Transaction History
          </h1>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[20px] font-mono font-bold text-white">
              ${totalSpent.toFixed(2)}
            </p>
            <p className="text-[10px] font-mono text-white/45 mt-1">
              Total Spent
            </p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[20px] font-mono font-bold text-neon-green">
              {pledgeCount}
            </p>
            <p className="text-[10px] font-mono text-white/45 mt-1">Pledges</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[20px] font-mono font-bold text-accent">
              {purchaseCount}
            </p>
            <p className="text-[10px] font-mono text-white/45 mt-1">
              Purchases
            </p>
          </div>
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mb-6"
        >
          <Filter className="w-3.5 h-3.5 text-white/50" />
          {(
            [
              ["all", "All"],
              ["pledge", "Pledges"],
              ["purchase", "Purchases"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-300 ${
                filter === val
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-white/45 hover:text-white/50 hover:bg-white/5 border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* List */}
        {loaded && filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="glass rounded-2xl p-10 max-w-sm mx-auto">
              <Clock className="w-10 h-10 text-white/45 mx-auto mb-4" />
              <h3 className="text-[15px] font-sans font-medium text-white/50 mb-2">
                No transactions yet
              </h3>
              <p className="text-[12px] font-mono text-white/40">
                Your pledges and purchases will appear here.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2 overflow-visible pr-10">
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return <HistoryContent />;
}
