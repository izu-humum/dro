"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  PackageCheck,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface EscrowData {
  escrowId: string;
  buyer: string;
  token: string;
  amount: number;
  amountRaw: string;
  deadline: number;
  deadlineDate: string;
  status: number;
  statusName: string;
  funded: boolean;
  deliveredAt: number;
  deliveredAtDate: string | null;
  graceEndsAt: number | null;
  graceEndsAtDate: string | null;
}

interface ActionResult {
  success?: boolean;
  error?: string;
  action?: string;
  txHash?: string;
  explorerUrl?: string;
  escrow?: EscrowData;
}

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "CREATED", color: "text-white/60", bg: "bg-white/20" },
  1: { label: "FUNDED", color: "text-neon-cyan", bg: "bg-neon-cyan" },
  2: { label: "RELEASED", color: "text-neon-green", bg: "bg-neon-green" },
  3: { label: "REFUNDED", color: "text-accent", bg: "bg-accent" },
  4: { label: "DISPUTED", color: "text-warning", bg: "bg-warning" },
  5: { label: "DELIVERED", color: "text-[#a78bfa]", bg: "bg-[#a78bfa]" },
};

const TOKEN_NAMES: Record<string, string> = {
  "0xc5add550534048ec1f5f65252653d1c744bb4ac2": "USDC",
  "0xc458e1a4eb04cd4e1fb56b1990cb5e9d35028bb2": "USDT",
};

export default function AdminPage() {
  const router = useRouter();
  const [escrowIdInput, setEscrowIdInput] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  };

  async function lookupEscrow() {
    const id = escrowIdInput.trim() || orderIdInput.trim();
    if (!id) return;

    setLoading(true);
    setResult(null);
    setEscrow(null);

    try {
      let eid = id;
      if (!id.startsWith("0x")) {
        const { keccak256, toUtf8Bytes } = await import("ethers");
        eid = keccak256(toUtf8Bytes(id));
      } else if (id.length === 42) {
        setResult({ error: "That looks like a contract/wallet address (20 bytes). Escrow IDs are 32-byte hashes (66 chars with 0x prefix). Try entering the Order ID string instead — it will be hashed automatically." });
        setLoading(false);
        return;
      } else if (id.length !== 66) {
        setResult({ error: `Invalid escrow ID length. Expected 66 characters (0x + 64 hex), got ${id.length}. Try entering the Order ID string instead.` });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", escrowId: eid }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Escrow not found" });
      } else {
        setEscrow(data);
        setEscrowIdInput(eid);
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Lookup failed" });
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action: string, releaseToTreasury?: boolean) {
    if (!escrow) return;

    setActionLoading(action + (releaseToTreasury !== undefined ? `-${releaseToTreasury}` : ""));
    setResult(null);

    try {
      const res = await fetch("/api/admin/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          escrowId: escrow.escrowId,
          ...(releaseToTreasury !== undefined && { releaseToTreasury }),
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.escrow) {
        setEscrow(data.escrow);
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setActionLoading(null);
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const tokenName = escrow ? TOKEN_NAMES[escrow.token.toLowerCase()] ?? "ERC20" : "";
  const statusCfg = escrow ? STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG[0] : STATUS_CONFIG[0];
  const deadlinePassed = escrow ? Date.now() / 1000 > escrow.deadline : false;
  const canDeliver = escrow && escrow.status === 1;
  const canRelease = escrow && (escrow.status === 1 || escrow.status === 4 || escrow.status === 5);
  const canRefund = escrow && (escrow.status === 1 || escrow.status === 4 || escrow.status === 5);
  const canResolve = escrow && escrow.status === 4;
  const isTerminal = escrow && (escrow.status === 2 || escrow.status === 3);

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="hue-overlay" />
      <Navbar />

      <main className="relative z-10 pt-28 pb-16 px-6 max-w-2xl mx-auto">
        <motion.button {...fadeUp} onClick={() => router.back()} className="flex items-center gap-2 text-[13px] font-mono text-white/45 hover:text-white transition-colors duration-300 mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        {/* Header */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <h1 className="text-[28px] font-sans font-medium text-white mb-2">Escrow Admin</h1>
          <p className="text-[13px] font-mono text-white/45 mb-10">Platform owner panel — release, refund, and resolve disputes on-chain</p>
        </motion.div>

        {/* Lookup */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="glass p-6 rounded-2xl border border-accent/10 mb-6">
          <p className="label-text mb-4 tracking-[0.1em] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-accent" />LOOKUP ESCROW
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-white/50 mb-1.5 block">Escrow ID (bytes32)</label>
              <input
                type="text"
                value={escrowIdInput}
                onFocus={() => { setOrderIdInput(""); setResult(null); }}
                onChange={(e) => { setEscrowIdInput(e.target.value); setResult(null); }}
                placeholder="0x + 64 hex characters"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-accent/30 transition-colors"
              />
              <p className="text-[10px] font-mono text-white/45 mt-1.5">keccak256 hash of the order ID — not a contract address</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] font-mono text-white/50">OR (recommended)</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/50 mb-1.5 block">Order ID (string → auto-hashed)</label>
              <input
                type="text"
                value={orderIdInput}
                onFocus={() => { setEscrowIdInput(""); setResult(null); }}
                onChange={(e) => { setOrderIdInput(e.target.value); setResult(null); }}
                placeholder="PB-20260407-0042"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-accent/30 transition-colors"
              />
              <p className="text-[10px] font-mono text-white/45 mt-1.5">Enter the order ID as-is — it will be hashed to the escrow ID automatically</p>
            </div>

            <button
              onClick={lookupEscrow}
              disabled={loading || (!escrowIdInput.trim() && !orderIdInput.trim())}
              className="w-full py-3 rounded-xl text-[13px] font-mono bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Looking up..." : "Lookup Escrow"}
            </button>
          </div>
        </motion.div>

        {/* Result message */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
                result.error
                  ? "bg-red-500/10 border border-red-500/15"
                  : "bg-neon-green/8 border border-neon-green/15"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {result.error
                  ? <AlertTriangle className="w-4 h-4 text-red-400" />
                  : <CheckCircle2 className="w-4 h-4 text-neon-green" />
                }
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className={`text-[13px] font-mono leading-relaxed break-words ${result.error ? "text-red-400/80" : "text-neon-green/80"}`}>
                  {result.error
                    ? result.error
                    : `${result.action?.toUpperCase()} successful`
                  }
                </p>
                {result.txHash && (
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-mono text-accent/60 hover:text-accent transition-colors"
                  >
                    {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escrow details */}
        <AnimatePresence>
          {escrow && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Status card */}
              <div className="glass p-6 rounded-2xl border border-accent/10 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="label-text tracking-[0.1em] flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-accent" />ESCROW DETAILS
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.bg}`} />
                    <span className={`text-[11px] font-mono ${statusCfg.color}`}>{statusCfg.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-mono text-white/50 mb-1">Amount</p>
                    <p className="text-[20px] font-sans font-medium text-white">
                      ${escrow.amount.toFixed(2)} <span className="text-[12px] text-white/45">{tokenName}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-white/50 mb-1">Deadline</p>
                    <p className={`text-[13px] font-mono ${deadlinePassed ? "text-red-400" : "text-white/60"}`}>
                      {new Date(escrow.deadline * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {deadlinePassed && <span className="text-[10px] ml-2 text-red-400/60">(PASSED)</span>}
                    </p>
                  </div>

                  {/* Grace Period (shown when delivered) */}
                  {escrow.deliveredAt > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-white/50 mb-1">Grace Period</p>
                    <p className={`text-[13px] font-mono ${escrow.graceEndsAt && Date.now() / 1000 > escrow.graceEndsAt ? "text-neon-green" : "text-[#a78bfa]"}`}>
                      {escrow.graceEndsAtDate
                        ? new Date(escrow.graceEndsAtDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "N/A"}
                      {escrow.graceEndsAt && Date.now() / 1000 > escrow.graceEndsAt
                        ? <span className="text-[10px] ml-2 text-neon-green/60">(READY FOR AUTO-RELEASE)</span>
                        : <span className="text-[10px] ml-2 text-[#a78bfa]/60">(BUYER CAN DISPUTE)</span>
                      }
                    </p>
                  </div>
                  )}
                </div>

                <div className="space-y-3">
                  <CopyRow label="Escrow ID" value={escrow.escrowId} copied={copied} onCopy={handleCopy} />
                  <CopyRow label="Buyer" value={escrow.buyer} copied={copied} onCopy={handleCopy} />
                  <CopyRow label="Token" value={`${escrow.token} (${tokenName})`} copyValue={escrow.token} copied={copied} onCopy={handleCopy} />
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-[11px] font-mono text-white/50">
                  <span className="flex items-center gap-1.5">
                    {escrow.funded ? <Lock className="w-3 h-3 text-neon-green/60" /> : <Unlock className="w-3 h-3" />}
                    {escrow.funded ? "Tokens locked" : "Not funded"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {deadlinePassed ? "Auto-refund eligible" : `${Math.ceil((escrow.deadline - Date.now() / 1000) / 86400)}d remaining`}
                  </span>
                </div>

                {/* Refresh button */}
                <button
                  onClick={lookupEscrow}
                  className="mt-4 w-full py-2 rounded-xl text-[11px] font-mono text-white/50 hover:text-white/40 border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {/* Actions */}
              {!isTerminal && (
                <div className="glass p-6 rounded-2xl border border-accent/10 mb-6">
                  <p className="label-text mb-5 tracking-[0.1em] flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-accent" />ACTIONS
                  </p>

                  <div className="space-y-3">
                    {/* Mark Delivered */}
                    <ActionButton
                      label="Mark Delivered"
                      description="Record proof of delivery — starts 3-day grace period for buyer to dispute. Auto-releases if no dispute."
                      icon={<PackageCheck className="w-4 h-4" />}
                      variant="accent"
                      disabled={!canDeliver}
                      loading={actionLoading === "deliver"}
                      onClick={() => executeAction("deliver")}
                    />

                    {/* Grace period info */}
                    {escrow.status === 5 && (
                      <div className="p-3 rounded-xl bg-[#a78bfa]/5 border border-[#a78bfa]/15">
                        <div className="flex items-center gap-2 text-[12px] font-mono text-[#a78bfa]/80">
                          <Timer className="w-3.5 h-3.5" />
                          Delivered — buyer has 3 days to dispute before auto-release
                        </div>
                      </div>
                    )}

                    {/* Release */}
                    <ActionButton
                      label="Release to Treasury"
                      description="Send payout to treasury immediately (minus 1% fee)"
                      icon={<ArrowUpRight className="w-4 h-4" />}
                      variant="green"
                      disabled={!canRelease}
                      loading={actionLoading === "release"}
                      onClick={() => executeAction("release")}
                    />

                    {/* Refund */}
                    <ActionButton
                      label="Refund to Buyer"
                      description="Return full amount to buyer wallet"
                      icon={<ArrowDownLeft className="w-4 h-4" />}
                      variant="accent"
                      disabled={!canRefund}
                      loading={actionLoading === "refund"}
                      onClick={() => executeAction("refund")}
                    />

                    {/* Resolve Dispute — only when disputed */}
                    {canResolve && (
                      <>
                        <div className="pt-2 pb-1">
                          <p className="text-[10px] font-mono text-white/50 tracking-[0.1em]">DISPUTE RESOLUTION</p>
                        </div>

                        <ActionButton
                          label="Resolve → Release to Treasury"
                          description="Seller wins dispute — release funds"
                          icon={<ArrowUpRight className="w-4 h-4" />}
                          variant="green"
                          loading={actionLoading === "resolve-true"}
                          onClick={() => executeAction("resolve", true)}
                        />

                        <ActionButton
                          label="Resolve → Refund to Buyer"
                          description="Buyer wins dispute — full refund"
                          icon={<ArrowDownLeft className="w-4 h-4" />}
                          variant="accent"
                          loading={actionLoading === "resolve-false"}
                          onClick={() => executeAction("resolve", false)}
                        />
                      </>
                    )}
                  </div>

                  {escrow.status === 0 && (
                    <p className="mt-4 text-[11px] font-mono text-white/50 text-center">
                      Escrow must be funded before any actions can be taken.
                    </p>
                  )}
                </div>
              )}

              {/* Terminal state */}
              {isTerminal && (
                <div className="glass p-6 rounded-2xl border border-white/5 mb-6">
                  <div className="flex items-center gap-3 justify-center">
                    <CheckCircle2 className={`w-5 h-5 ${escrow.status === 2 ? "text-neon-green" : "text-accent"}`} />
                    <p className="text-[14px] font-mono text-white/50">
                      Escrow is <span className={statusCfg.color}>{statusCfg.label.toLowerCase()}</span> — no further actions available
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CopyRow({ label, value, copyValue, copied, onCopy }: {
  label: string;
  value: string;
  copyValue?: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const cv = copyValue ?? value;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-white/50">{label}</span>
      <button
        onClick={() => onCopy(cv, label)}
        className="flex items-center gap-1.5 text-[11px] font-mono text-white/45 hover:text-white/50 transition-colors max-w-[65%] truncate"
      >
        <span className="truncate">{value}</span>
        {copied === label ? <Check className="w-3 h-3 text-neon-green flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0" />}
      </button>
    </div>
  );
}

function ActionButton({ label, description, icon, variant, disabled, loading, onClick }: {
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: "green" | "accent" | "warning";
  disabled?: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: "border-neon-green/15 hover:border-neon-green/30 hover:bg-neon-green/5",
    accent: "border-accent/15 hover:border-accent/30 hover:bg-accent/5",
    warning: "border-warning/15 hover:border-warning/30 hover:bg-warning/5",
  };
  const textColors = {
    green: "text-neon-green",
    accent: "text-accent",
    warning: "text-warning",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full p-4 rounded-xl border transition-all duration-300 text-left flex items-center gap-4 disabled:opacity-20 disabled:cursor-not-allowed ${colors[variant]}`}
    >
      <div className={`flex-shrink-0 ${loading ? "animate-spin" : ""} ${disabled ? "text-white/50" : textColors[variant]}`}>
        {loading ? <Loader2 className="w-4 h-4" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-mono ${disabled ? "text-white/50" : "text-white/70"}`}>{label}</p>
        <p className="text-[11px] font-mono text-white/50 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
