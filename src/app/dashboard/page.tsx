"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  DollarSign,
  PiggyBank,
  Lock,
  CreditCard,
  Wallet,
  CheckCircle2,
  Truck,
  ArrowUpRight,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Package,
  Search,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { mockOrders, pastOrders } from "@/lib/mockData";
import { useWallet } from "@/lib/wallet/context";

const allOrders = [...mockOrders, ...pastOrders];
const totalOrders = allOrders.length;
const totalSpent = allOrders.reduce((s, o) => s + o.price, 0);
const activeEscrow = mockOrders
  .filter((o) => o.status !== "delivered")
  .reduce((s, o) => s + o.price, 0);
const totalSaved = Math.round(totalSpent * 0.065);

const stats = [
  { label: "Orders", value: `${totalOrders}`, icon: <ShoppingBag className="w-5 h-5" /> },
  { label: "Spent", value: `$${totalSpent.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" /> },
  { label: "Saved", value: `$${totalSaved}`, icon: <PiggyBank className="w-5 h-5" /> },
  { label: "Escrowed", value: `$${activeEscrow.toFixed(2)}`, icon: <Lock className="w-5 h-5" /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const wallet = useWallet();
  const [paymentMode, setPaymentMode] = useState<"fiat" | "crypto">(
    wallet.connected ? "crypto" : "fiat",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/results?q=${encodeURIComponent(q)}`);
  };

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    trade_sent: { icon: <RotateCcw className="w-3.5 h-3.5" />, label: "Trade Sent", color: "text-accent bg-accent/10" },
    in_transit: { icon: <Truck className="w-3.5 h-3.5" />, label: "In Transit", color: "text-neon-blue bg-neon-blue/10" },
    delivered: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Delivered", color: "text-neon-green bg-neon-green/10" },
    processing: { icon: <Package className="w-3.5 h-3.5" />, label: "Processing", color: "text-warning bg-warning/10" },
    purchasing: { icon: <Package className="w-3.5 h-3.5" />, label: "Purchasing", color: "text-accent bg-accent/10" },
    shipped: { icon: <Truck className="w-3.5 h-3.5" />, label: "Shipped", color: "text-neon-blue bg-neon-blue/10" },
    disputed: { icon: <Package className="w-3.5 h-3.5" />, label: "Disputed", color: "text-danger bg-danger/10" },
  };

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

      <main className="relative z-10 pt-28 pb-16 px-6 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[22px] font-sans font-medium text-white">Welcome back</h1>
            <p className="text-[13px] font-mono text-white/50 mt-1">Your Dro dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaymentMode("fiat")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono transition-all duration-300 ${paymentMode === "fiat" ? "bg-accent/10 text-accent border border-accent/20" : "glass text-white/50"}`}>
              <CreditCard className="w-3 h-3" /> Fiat
            </button>
            <button
              onClick={() => {
                if (wallet.connected) {
                  setPaymentMode("crypto");
                } else {
                  wallet.openModal();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono transition-all duration-300 ${paymentMode === "crypto" ? "bg-accent/10 text-accent border border-accent/20" : "glass text-white/50"}`}
            >
              <Wallet className="w-3 h-3" /> {wallet.connected ? wallet.shortAddress : "Connect"}
            </button>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="mb-8">
          <div className="glass-strong rounded-2xl flex items-center p-2">
            <div className="pl-3 pr-2">
              <Search className="w-4 h-4 text-white/20" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='Search anything — "AWP Asiimov" · "Logitech MX Master"'
              className="flex-1 bg-transparent py-3 text-[13px] text-white placeholder:text-white/35 focus:outline-none font-mono"
            />
            <button
              onClick={handleSearch}
              className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/25 transition-all duration-300"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="glass p-5 rounded-2xl text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent/8 text-accent mb-3">{stat.icon}</div>
              <div className="text-[20px] font-bold font-mono accent-value text-glow">{stat.value}</div>
              <div className="text-[11px] font-mono text-white/60 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Active Orders */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="label-text tracking-[0.1em]">ACTIVE ORDERS</p>
            <span className="text-[11px] font-mono accent-value">{mockOrders.length} active</span>
          </div>
          <div className="space-y-3">
            {mockOrders.map((order, i) => {
              const config = statusConfig[order.status] || statusConfig.processing;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}>
                  <div onClick={() => router.push("/tracking")} className="glass rounded-2xl p-4 cursor-pointer hover:bg-glass-hover hover:shadow-[0_4px_40px_rgba(206,202,251,0.06)] transition-all duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/3 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {order.image ? (
                            <img src={`/api/img?url=${encodeURIComponent(order.image)}`} alt={order.item} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                          ) : null}
                          <span className={`text-[12px] font-bold text-white/30 ${order.image ? "hidden" : ""}`}>{order.source.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-white/70">#{order.id.split("-").pop()}</span>
                            <span className="text-[14px] font-sans font-medium text-white">{order.item}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-mono text-white/60">{order.source}</span>
                            <span className="text-[12px] font-mono text-white/70">${order.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Past Orders */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="label-text tracking-[0.1em]">PAST ORDERS</p>
            <span className="text-[11px] font-mono text-white/60">{pastOrders.length} completed</span>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {pastOrders.map((order, i) => (
                <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 + i * 0.04, duration: 0.5 }} className="flex items-center justify-between px-5 py-4 hover:bg-glass-hover transition-colors duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/30 overflow-hidden flex-shrink-0">
                      {(order as { image?: string }).image ? (
                        <img src={`/api/img?url=${encodeURIComponent((order as { image?: string }).image!)}`} alt={order.item} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : order.source.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/60">#{order.id.split("-").pop()}</span>
                        <span className="text-[13px] font-medium text-white">{order.item}</span>
                      </div>
                      <span className="text-[11px] font-mono text-white/60">{order.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-mono text-white/70">${order.price.toFixed(2)}</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-neon-green/90 bg-neon-green/10 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Delivered
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.6 }} className="mt-10 flex gap-3 justify-center">
          <button onClick={() => router.push("/")} className="btn-secondary !text-[12px] flex items-center gap-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> New Search
          </button>
          <button className="btn-secondary !text-[12px] !border-white/10 flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> View on Explorer
          </button>
        </motion.div>
      </main>
    </div>
  );
}
