"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Loader2,
  LogOut,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { useWallet } from "@/lib/wallet/context";

const WALLET_OPTIONS = [
  {
    id: "metamask" as const,
    name: "MetaMask",
    icon: "🦊",
    desc: "Browser extension",
  },
  {
    id: "walletconnect" as const,
    name: "WalletConnect",
    icon: "🔗",
    desc: "Scan with mobile wallet",
  },
  {
    id: "coinbase" as const,
    name: "Coinbase Wallet",
    icon: "🔵",
    desc: "Coinbase Wallet app",
  },
];

export default function WalletModal() {
  const {
    connected,
    address,
    shortAddress,
    chain,
    balance,
    tokens,
    provider,
    modalOpen,
    closeModal,
    connect,
    disconnect,
    refreshBalances,
    error,
    loading,
  } = useWallet();

  const [manualAddress, setManualAddress] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {modalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
          >
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0a16]/98 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <Wallet size={16} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-sans font-semibold text-white">
                      {connected ? "Wallet" : "Connect Wallet"}
                    </h2>
                    <p className="text-[11px] font-mono text-white/45">
                      {connected ? chain ?? "Connected" : "Choose your wallet provider"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/60 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {connected ? (
                  /* ---- Connected State ---- */
                  <div className="space-y-4">
                    {/* Address card */}
                    <div className="glass p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-mono text-white/45 uppercase tracking-wider">
                          {provider === "manual" ? "External Wallet" : provider}
                        </span>
                        <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FCFF52]/10 to-[#35D07F]/10 flex items-center justify-center overflow-hidden">
                          <img src="/tokens/celo.svg" alt="Celo" className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-mono text-white">
                            {shortAddress}
                          </p>
                          <p className="text-[11px] font-mono text-white/45">
                            {chain ?? "Celo"}
                          </p>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/45 hover:text-white/60 transition-colors"
                        >
                          {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Token Balances */}
                    <div className="glass p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-mono text-white/45 uppercase tracking-wider">
                          Balances
                        </span>
                        <button
                          onClick={refreshBalances}
                          className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/40 hover:text-white/50 transition-colors"
                        >
                          <RefreshCw size={10} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(tokens.length > 0 ? tokens : [
                          { symbol: "CELO", balance: balance ?? "0", decimals: 18, contractAddress: null },
                          { symbol: "USDC", balance: "0", decimals: 6, contractAddress: "" },
                          { symbol: "USDT", balance: "0", decimals: 6, contractAddress: "" },
                        ]).map((token) => {
                          const tokenIcons: Record<string, { icon: string; label: string }> = {
                            CELO: { icon: "/tokens/celo.svg", label: "Native" },
                            USDC: { icon: "/tokens/usdc.png", label: "Celo USDC" },
                            USDT: { icon: "/tokens/usdt.png", label: "Celo USDT" },
                          };
                          const info = tokenIcons[token.symbol] ?? { icon: "", label: "Token" };
                          const bal = parseFloat(token.balance);
                          const isZero = bal === 0;

                          return (
                            <div key={token.symbol} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={info.icon}
                                  alt={token.symbol}
                                  className="w-8 h-8 rounded-full"
                                />
                                <div>
                                  <p className="text-[13px] font-mono font-medium text-white">
                                    {token.symbol}
                                  </p>
                                  <p className="text-[10px] font-mono text-white/50">
                                    {info.label}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className={`text-[14px] font-mono font-medium ${isZero ? "text-white/50" : "text-white"}`}>
                                  {isZero ? "0.00" : token.balance}
                                </p>
                                {isZero && token.symbol !== "CELO" && (
                                  <a
                                    href={`https://app.mento.org/swap/celo?from=CELO&to=${token.symbol}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#35D07F]/10 text-[#35D07F] border border-[#35D07F]/20 hover:bg-[#35D07F]/20 transition-colors"
                                  >
                                    Swap
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mento swap link if any token is zero */}
                      {(tokens.length > 0 ? tokens : []).some((t) => parseFloat(t.balance) === 0) && (
                        <a
                          href="https://app.mento.org/swap/celo?from=USDC&to=GBPm"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-3 p-2.5 rounded-xl bg-[#35D07F]/5 border border-[#35D07F]/10 hover:bg-[#35D07F]/10 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded-md bg-[#35D07F]/15 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35D07F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-mono text-[#35D07F] group-hover:text-[#35D07F]/90">
                              Swap tokens on Mento
                            </p>
                            <p className="text-[9px] font-mono text-white/50">
                              Get USDC, USDT, or other Celo stables
                            </p>
                          </div>
                          <ExternalLink size={10} className="text-[#35D07F]/40 group-hover:text-[#35D07F]/60" />
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      {address && (
                        <a
                          href={`https://celoscan.io/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-[12px] font-mono text-white/40 hover:text-white/60 transition-colors"
                        >
                          <ExternalLink size={12} /> Celoscan
                        </a>
                      )}
                      <button
                        onClick={() => { disconnect(); closeModal(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] font-mono text-red-400 hover:bg-red-500/15 transition-colors"
                      >
                        <LogOut size={12} /> Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---- Not Connected State ---- */
                  <div className="space-y-3">
                    {/* Wallet options */}
                    {WALLET_OPTIONS.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => connect(wallet.id)}
                        disabled={loading}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group"
                      >
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-sans text-white group-hover:text-accent transition-colors">
                            {wallet.name}
                          </p>
                          <p className="text-[11px] font-mono text-white/40">
                            {wallet.desc}
                          </p>
                        </div>
                        {loading ? (
                          <Loader2 size={16} className="text-white/50 animate-spin" />
                        ) : (
                          <ChevronRight size={16} className="text-white/50 group-hover:text-white/45 transition-colors" />
                        )}
                      </button>
                    ))}

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">or</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Manual address input */}
                    {showManual ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="0x... paste wallet address"
                            className="flex-1 bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/45 focus:outline-none focus:border-accent/30 transition-colors"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowManual(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-[12px] font-mono text-white/45 hover:text-white/50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => connect("manual", manualAddress)}
                            disabled={loading || !manualAddress}
                            className="flex-1 py-3 rounded-xl bg-accent/15 border border-accent/25 text-[12px] font-mono text-accent hover:bg-accent/25 transition-colors disabled:opacity-30"
                          >
                            {loading ? (
                              <Loader2 size={14} className="mx-auto animate-spin" />
                            ) : (
                              "Connect"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowManual(true)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed border-white/8 hover:border-white/15 transition-all duration-300 group"
                      >
                        <Unplug className="w-6 h-6 text-white/50 group-hover:text-white/40 transition-colors" />
                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-sans text-white/50 group-hover:text-white/70 transition-colors">
                            Paste Address
                          </p>
                          <p className="text-[11px] font-mono text-white/50">
                            Connect any external wallet by address
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-white/45 group-hover:text-white/50 transition-colors" />
                      </button>
                    )}

                    {/* Error */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15"
                      >
                        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                        <p className="text-[12px] font-mono text-red-400/80">{error}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5">
                <p className="text-[10px] font-mono text-white/50 text-center">
                  {connected
                    ? "Your wallet is connected to DRO Protocol"
                    : "By connecting, you agree to the DRO Terms of Service"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
