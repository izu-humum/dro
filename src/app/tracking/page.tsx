"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Shield,
  AlertTriangle,
  ExternalLink,
  Clock,
  Copy,
  Check,
  Plus,
  Timer,
  Bot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { mockOrders } from "@/lib/mockData";
import type { Order } from "@/lib/mockData";

type OrderStatus = Order["status"] | "confirmed" | "refunded";

const EXTEND_OPTIONS = [
  { label: "+3 days", days: 3 },
  { label: "+7 days", days: 7 },
  { label: "+14 days", days: 14 },
];

export default function TrackingPage() {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[0]);
  const [copied, setCopied] = useState(false);
  const [baseDays] = useState(14);
  const [extraDays, setExtraDays] = useState(0);
  const totalDays = baseDays + extraDays;
  const [countdown, setCountdown] = useState({ days: 13, hours: 19, minutes: 25, seconds: 0 });

  // Action states
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(selectedOrder.status);
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showExtendMenu, setShowExtendMenu] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [extendingTimer, setExtendingTimer] = useState(false);

  // Reset status when order changes
  useEffect(() => {
    setOrderStatus(selectedOrder.status);
    setActionMessage(null);
    setShowConfirmModal(false);
    setShowDisputeModal(false);
    setShowExtendMenu(false);
    setExtraDays(0);
  }, [selectedOrder]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Confirm Delivery ----
  const handleConfirmDelivery = useCallback(async () => {
    setConfirming(true);
    setActionMessage(null);
    try {
      // Call the chat API to simulate confirmation via the orchestrator
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Confirm delivery for order ${selectedOrder.id}. Release escrow funds to seller.`,
          context: { orderId: selectedOrder.id, page: "tracking" },
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      setOrderStatus("confirmed");
      setActionMessage({
        type: "success",
        text: `Delivery confirmed! Escrow funds ($${selectedOrder.price.toFixed(2)}) released to seller. Thank you for using DRO.`,
      });
      setShowConfirmModal(false);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to confirm delivery",
      });
    } finally {
      setConfirming(false);
    }
  }, [selectedOrder]);

  // ---- Open Dispute ----
  const handleOpenDispute = useCallback(async () => {
    if (!disputeReason.trim()) return;
    setDisputing(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          reason: disputeReason,
          evidence: disputeEvidence || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();

      setOrderStatus("disputed");
      setActionMessage({
        type: "success",
        text: `Dispute opened (${data.dispute?.disputeId ?? "pending"}). Escrow funds are frozen. Our team will review within 48 hours. Auto-refund timer continues.`,
      });
      setShowDisputeModal(false);
      setDisputeReason("");
      setDisputeEvidence("");
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to open dispute",
      });
    } finally {
      setDisputing(false);
    }
  }, [selectedOrder, disputeReason, disputeEvidence]);

  // ---- Extend Timer ----
  const handleExtendTimer = useCallback((days: number) => {
    setExtendingTimer(true);
    // Simulate a brief processing delay
    setTimeout(() => {
      setExtraDays((prev) => prev + days);
      setCountdown((prev) => ({
        ...prev,
        days: prev.days + days,
      }));
      setActionMessage({
        type: "success",
        text: `Auto-refund timer extended by ${days} days. New deadline: ${totalDays + days} days total.`,
      });
      setShowExtendMenu(false);
      setExtendingTimer(false);
    }, 500);
  }, [totalDays]);

  const escrowPercent = ((totalDays - countdown.days) / totalDays) * 100;
  const isResolved = orderStatus === "confirmed" || orderStatus === "refunded";
  const isDisputed = orderStatus === "disputed";

  const statusLabel = (() => {
    switch (orderStatus) {
      case "confirmed": return { text: "DELIVERED", color: "text-neon-green", bg: "bg-neon-green", dot: "bg-neon-green" };
      case "disputed": return { text: "DISPUTED", color: "text-warning", bg: "bg-warning", dot: "bg-warning" };
      case "refunded": return { text: "REFUNDED", color: "text-accent", bg: "bg-accent", dot: "bg-accent" };
      default: return { text: "ACTIVE", color: "text-neon-green", bg: "bg-neon-green", dot: "bg-neon-green pulse-dot" };
    }
  })();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="hue-overlay" />
      <Navbar />

      <main className="relative z-10 pt-28 pb-16 px-6 max-w-xl mx-auto">
        <motion.button {...fadeUp} onClick={() => router.back()} className="flex items-center gap-2 text-[13px] font-mono text-white/45 hover:text-white transition-colors duration-300 mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        {/* Order tabs */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {mockOrders.map((order) => (
            <button key={order.id} onClick={() => setSelectedOrder(order)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[11px] font-mono transition-all duration-300 ${selectedOrder.id === order.id ? "bg-accent/10 border border-accent/25 text-accent" : "glass text-white/45 hover:text-white/50"}`}>
              #{order.id.split("-").pop()} · {order.item}
            </button>
          ))}
        </motion.div>

        {/* Header */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="glass p-6 rounded-2xl border border-accent/10 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-white/50">ORDER #{selectedOrder.id}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${statusLabel.dot}`} />
              <span className={statusLabel.color}>{statusLabel.text}</span>
            </span>
          </div>
          <h2 className="text-[18px] font-sans font-medium text-white">{selectedOrder.item}</h2>
          <p className="text-[12px] font-mono text-white/45 mt-1">{selectedOrder.source} · ${selectedOrder.price.toFixed(2)} · {selectedOrder.date}</p>
        </motion.div>

        {/* Action Message */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${actionMessage.type === "success" ? "bg-neon-green/8 border border-neon-green/15" : "bg-red-500/10 border border-red-500/15"}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {actionMessage.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  : <AlertTriangle className="w-4 h-4 text-red-400" />
                }
              </div>
              <p className={`text-[13px] font-mono leading-relaxed ${actionMessage.type === "success" ? "text-neon-green/80" : "text-red-400/80"}`}>
                {actionMessage.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="glass p-6 rounded-2xl mb-6">
          <p className="label-text mb-6 tracking-[0.1em]">TIMELINE</p>
          <div className="space-y-0">
            {selectedOrder.timeline.map((event, i) => (
              <TimelineItem key={i} event={event} isLast={i === selectedOrder.timeline.length - 1} index={i} />
            ))}
            {/* Extra timeline events based on actions */}
            {orderStatus === "confirmed" && (
              <TimelineItem
                event={{ label: "Delivery confirmed by buyer", time: "Just now", status: "done", detail: "Escrow funds released to seller" }}
                isLast index={selectedOrder.timeline.length}
              />
            )}
            {orderStatus === "disputed" && (
              <TimelineItem
                event={{ label: "Dispute opened by buyer", time: "Just now", status: "active", detail: `Reason: ${disputeReason || "Not specified"}` }}
                isLast index={selectedOrder.timeline.length}
              />
            )}
          </div>
        </motion.div>

        {/* Escrow */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="glass p-6 rounded-2xl border border-accent/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="label-text tracking-[0.1em] flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-accent" />ESCROW STATUS</p>
            <button onClick={() => handleCopy(selectedOrder.escrowAddress || "")} className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white/40 transition-colors duration-300">
              {selectedOrder.escrowAddress}
              {copied ? <Check className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Progress */}
          <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${isResolved ? 100 : Math.min(escrowPercent, 100)}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute inset-y-0 left-0 rounded-full ${isResolved ? "bg-gradient-to-r from-neon-green/60 to-neon-green" : "bg-gradient-to-r from-accent/60 to-accent"}`}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold font-mono accent-value text-glow">
              {isResolved ? "Released" : "Held"}: ${selectedOrder.price.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 text-[12px] text-white/45 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {isResolved ? (
                <span className="text-neon-green">Escrow {orderStatus === "confirmed" ? "released" : "refunded"}</span>
              ) : (
                <span>Auto-refund: <span className="accent-value">{countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</span></span>
              )}
            </div>
          </div>

          {/* Extended timer badge */}
          {extraDays > 0 && !isResolved && (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-accent/60">
              <Timer className="w-3 h-3" />
              Extended by {extraDays} days (total: {totalDays} days)
            </div>
          )}

          {/* Extend Timer Button */}
          {!isResolved && (
            <div className="mt-4 relative">
              <button
                onClick={() => setShowExtendMenu(!showExtendMenu)}
                disabled={extendingTimer}
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[12px] font-mono text-white/45 hover:text-white/50 hover:border-white/20 hover:bg-white/[0.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                {extendingTimer ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extending...</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> Extend Auto-Refund Timer</>
                )}
              </button>
              <AnimatePresence>
                {showExtendMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute bottom-full left-0 right-0 mb-2 glass-strong rounded-xl p-2 z-50"
                  >
                    <p className="text-[10px] font-mono text-white/40 px-2 py-1 mb-1">Extend the auto-refund deadline if you need more time:</p>
                    {EXTEND_OPTIONS.map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() => handleExtendTimer(opt.days)}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-mono text-white/50 hover:text-accent hover:bg-accent/8 transition-all duration-200 flex items-center justify-between"
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-white/50">→ {totalDays + opt.days}d total</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        {!isResolved && (
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} className="flex gap-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isDisputed}
              className="flex-1 btn-primary flex items-center justify-center gap-2 !py-4 disabled:opacity-30"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Delivery
            </button>
            <button
              onClick={() => setShowDisputeModal(true)}
              disabled={isDisputed}
              className="flex-1 py-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-[13px] font-mono hover:bg-danger/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <AlertTriangle className="w-4 h-4" /> Open Dispute
            </button>
          </motion.div>
        )}

        {/* Confirm Delivery Modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
              onClick={() => !confirming && setShowConfirmModal(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative glass-strong p-8 rounded-2xl max-w-md w-full border border-white/[0.06]"
              >
                <div className="w-14 h-14 rounded-2xl bg-neon-green/12 border border-neon-green/25 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7 text-neon-green" />
                </div>
                <h3 className="text-[18px] font-sans font-medium text-white text-center mb-2">
                  Confirm Delivery?
                </h3>
                <p className="text-[13px] font-mono text-white/40 text-center mb-8 leading-relaxed">
                  This will release <span className="text-white/70">${selectedOrder.price.toFixed(2)}</span> from escrow to the seller. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={confirming}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-[13px] font-mono text-white/40 hover:text-white/60 hover:border-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={confirming}
                    className="flex-1 py-3.5 rounded-xl bg-neon-green/15 border border-neon-green/30 text-[13px] font-mono text-neon-green hover:bg-neon-green/25 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {confirming ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Yes, Confirm</>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dispute Modal */}
        <AnimatePresence>
          {showDisputeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
              onClick={() => !disputing && setShowDisputeModal(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative glass-strong p-8 rounded-2xl max-w-md w-full border border-white/[0.06]"
              >
                <div className="w-14 h-14 rounded-2xl bg-danger/12 border border-danger/25 flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle className="w-7 h-7 text-danger" />
                </div>
                <h3 className="text-[18px] font-sans font-medium text-white text-center mb-2">
                  Open a Dispute
                </h3>
                <p className="text-[13px] font-mono text-white/40 text-center mb-6">
                  Escrow funds will be frozen until resolved. Our team reviews within 48h.
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="label-text mb-2 block">REASON</label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:outline-none focus:border-accent/30 transition-colors duration-300 appearance-none"
                    >
                      <option value="" className="bg-[#141022]">Select a reason...</option>
                      <option value="Item not received" className="bg-[#141022]">Item not received</option>
                      <option value="Wrong item received" className="bg-[#141022]">Wrong item received</option>
                      <option value="Item damaged or defective" className="bg-[#141022]">Item damaged or defective</option>
                      <option value="Item not as described" className="bg-[#141022]">Item not as described</option>
                      <option value="Seller unresponsive" className="bg-[#141022]">Seller unresponsive</option>
                      <option value="Other" className="bg-[#141022]">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-text mb-2 block">DETAILS (OPTIONAL)</label>
                    <textarea
                      value={disputeEvidence}
                      onChange={(e) => setDisputeEvidence(e.target.value)}
                      placeholder="Describe what happened..."
                      rows={3}
                      className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisputeModal(false)}
                    disabled={disputing}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-[13px] font-mono text-white/40 hover:text-white/60 hover:border-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOpenDispute}
                    disabled={disputing || !disputeReason}
                    className="flex-1 py-3.5 rounded-xl bg-danger/15 border border-danger/30 text-[13px] font-mono text-danger hover:bg-danger/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    {disputing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" /> Submit Dispute</>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TimelineItem({ event, isLast, index }: {
  event: { label: string; time: string; status: string; detail?: string };
  isLast: boolean; index: number;
}) {
  const getIcon = () => {
    switch (event.status) {
      case "done": return <CheckCircle2 className="w-4 h-4 text-neon-green/70" />;
      case "active": return <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Loader2 className="w-4 h-4 text-accent" /></motion.div>;
      default: return <Circle className="w-4 h-4 text-white/45" />;
    }
  };
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        {!isLast && <div className={`w-px flex-1 my-1 ${event.status === "done" ? "bg-neon-green/15" : "bg-white/5"}`} />}
      </div>
      <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
        <div className="flex items-center gap-3">
          <span className={`text-[13px] font-mono ${event.status === "pending" ? "text-white/50" : "text-white/70"}`}>{event.label}</span>
          {event.time && <span className="text-[11px] font-mono text-white/50">{event.time}</span>}
          {event.status === "done" && <span className="text-[10px] font-mono text-neon-green/60 bg-neon-green/8 px-1.5 py-0.5 rounded">DONE</span>}
          {event.status === "active" && <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">ACTIVE</span>}
        </div>
        {event.detail && (
          <p className="text-[11px] font-mono text-white/50 mt-1 flex items-center gap-1">
            {event.detail}
            {(event.detail.startsWith("Tx:") || event.detail.startsWith("Contract:")) && <ExternalLink className="w-2.5 h-2.5 text-white/45 hover:text-accent transition-colors cursor-pointer" />}
          </p>
        )}
      </div>
    </motion.div>
  );
}
