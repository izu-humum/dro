"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Shield,
  Zap,
  Lock,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  Bot,
  AlertCircle,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/lib/wallet/context";
import { addHistory } from "@/lib/history";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const wallet = useWallet();

  const [payMethod, setPayMethod] = useState<"fiat" | "crypto">(
    wallet.connected ? "crypto" : "fiat",
  );

  // Product info from URL params
  const name = searchParams.get("name") || "AK-47 | Redline (Field-Tested)";
  const productId = searchParams.get("id") || "1";
  const price = parseFloat(searchParams.get("price") || "27.45");
  const source = searchParams.get("source") || "Steam Community Market";
  const float = searchParams.get("float") || "";

  // Fee calculation
  const protocolFee = Math.round(price * 0.01 * 100) / 100;
  const platformFee = Math.round(price * 0.01 * 100) / 100;
  const total = Math.round((price + protocolFee + platformFee) * 100) / 100;
  const isSteam = source.toLowerCase().includes("steam");
  const isDigital = isSteam || /skinport|buff163|g2a|key|digital|instant/i.test(source + " " + name);

  // Form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [steamTradeUrl, setSteamTradeUrl] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [address, setAddress] = useState({ street: "", city: "", state: "", zip: "" });
  const [payToken, setPayToken] = useState<"USDC" | "USDT">("USDC");

  // Get token balance from wallet
  const selectedTokenBalance = wallet.tokens.find((t) => t.symbol === payToken);
  const tokenBal = selectedTokenBalance ? parseFloat(selectedTokenBalance.balance) : 0;
  const hasEnough = tokenBal >= total;

  // Purchase state
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseEvents, setPurchaseEvents] = useState<
    Array<{ type: string; agent: string; data: Record<string, unknown> }>
  >([]);
  // On-chain transaction state
  const [txStep, setTxStep] = useState<"idle" | "creating" | "approving" | "funding" | "confirming" | "done">("idle");
  const [txHashes, setTxHashes] = useState<{ escrow?: string; approve?: string; fund?: string }>({});
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetDone, setFaucetDone] = useState(false);

  // Get test USDC from faucet
  const handleFaucet = async () => {
    if (!wallet.address) return;
    setFaucetLoading(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      if (res.ok) {
        setFaucetDone(true);
        wallet.refreshBalances();
      }
    } catch { /* ignore */ }
    setFaucetLoading(false);
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    setPurchaseError(null);
    setPurchaseEvents([]);
    setTxStep("idle");
    setTxHashes({});

    try {
      // ── Crypto path: on-chain escrow via MetaMask ──
      if (payMethod === "crypto" && wallet.connected) {
        const { approveToken, fundEscrow, waitForReceipt, ensureChain } = await import("@/lib/contracts/escrow");
        const { ESCROW_FACTORY_ADDRESS, USDC_ADDRESS, USDT_ADDRESS } = await import("@/lib/contracts/addresses");

        const tokenAddress = payToken === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;
        const amountWei = BigInt(Math.round(total * 1e6)); // 6 decimals
        const orderId = `DRO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Step 1: Ensure correct chain
        await ensureChain();

        // Step 2: Server creates escrow on-chain (onlyOwner)
        setTxStep("creating");
        const escrowRes = await fetch("/api/escrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            buyer: wallet.address,
            token: tokenAddress,
            amount: total,
            deadlineDays: 14,
          }),
        });
        if (!escrowRes.ok) {
          const err = await escrowRes.json();
          throw new Error(err.error || "Failed to create escrow");
        }
        const escrowData = await escrowRes.json();
        setTxHashes((h) => ({ ...h, escrow: escrowData.txHash }));

        // Step 3: Approve token spending
        setTxStep("approving");
        const approveTx = await approveToken(tokenAddress, ESCROW_FACTORY_ADDRESS, amountWei);
        setTxHashes((h) => ({ ...h, approve: approveTx.hash }));
        const approveReceipt = await waitForReceipt(approveTx.hash);
        if (!approveReceipt.status) throw new Error("Token approval failed");

        // Step 4: Fund escrow
        setTxStep("funding");
        const fundTx = await fundEscrow(escrowData.escrowId);
        setTxHashes((h) => ({ ...h, fund: fundTx.hash }));
        const fundReceipt = await waitForReceipt(fundTx.hash);
        if (!fundReceipt.status) throw new Error("Escrow funding failed");

        // Step 5: Confirm with server
        setTxStep("confirming");
      }

      // ── Call server API (both fiat and crypto) ──
      const body = {
        productId,
        source,
        price: total,
        itemName: name,
        paymentMethod: payMethod === "crypto" ? "crypto" : "card",
        deliveryInfo: {
          type: isSteam ? "steam_trade" : isDigital ? "email" : "shipping",
          steamTradeUrl: isSteam ? steamTradeUrl : undefined,
          email: isDigital && !isSteam ? deliveryEmail : undefined,
          address: !isDigital
            ? { name: "Buyer", street: address.street, city: address.city, state: address.state, zip: address.zip, country: "US" }
            : undefined,
        },
        cardInfo: payMethod === "fiat"
          ? { number: cardNumber, expiry: cardExpiry, cvv: cardCvv }
          : undefined,
        walletAddress: payMethod === "crypto" ? wallet.address : undefined,
        token: payMethod === "crypto" ? payToken : undefined,
        txHashes: payMethod === "crypto" ? txHashes : undefined,
      };

      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Purchase failed: ${res.status}`);

      const data = await res.json();
      setPurchaseEvents(data.events ?? []);
      setTxStep("done");

      // Save to history
      addHistory({
        type: "purchase",
        title: name,
        subtitle: source,
        amount: total,
        currency: payMethod === "crypto" ? payToken : "USD",
        paymentMethod: payMethod,
        walletAddress: payMethod === "crypto" ? wallet.address ?? undefined : undefined,
        txHashes: payMethod === "crypto" ? txHashes : undefined,
        productId,
        source,
      });

      // Navigate to tracking on success
      if (data.orderId) {
        setTimeout(() => router.push("/tracking"), 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      // Don't show "user rejected" as an error — they just cancelled
      if (msg.includes("rejected") || msg.includes("denied")) {
        setPurchaseError("Transaction cancelled by user");
      } else {
        setPurchaseError(msg);
      }
      setTxStep("idle");
    } finally {
      setPurchasing(false);
    }
  };

  // Validation
  const canPurchase =
    !purchasing &&
    (payMethod === "fiat"
      ? cardNumber.length >= 4 && cardExpiry.length >= 4 && cardCvv.length >= 3
      : wallet.connected) &&
    (isSteam ? steamTradeUrl.length > 10 : isDigital ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail) : address.street.length > 0);

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
        {/* Back */}
        <motion.button {...fadeUp} onClick={() => router.back()} className="flex items-center gap-2 text-[13px] font-mono text-white/45 hover:text-white transition-colors duration-300 mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="text-center mb-10">
          <p className="label-text mb-3 tracking-[0.15em]">CHECKOUT</p>
          <h1 className="heading-section !text-[clamp(24px,3dvw,40px)]">Order Summary</h1>
        </motion.div>

        {/* Item */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="glass p-6 rounded-2xl mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center flex-shrink-0">
              <div className="text-lg font-black text-white/5">{source[0]}</div>
            </div>
            <div>
              <h2 className="text-[15px] font-sans font-medium text-white">{name}</h2>
              <p className="text-[12px] font-mono text-white/45 mt-1">{source}</p>
              {float && <p className="text-[12px] font-mono text-white/45 mt-1 flex items-center gap-1"><Zap className="w-3 h-3 text-accent" />Float: {float}</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3 font-mono text-[13px]">
            <div className="flex justify-between"><span className="text-white/40">Price</span><span>${price.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Protocol Fee (1%)</span><span>${protocolFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Platform Fee (1%)</span><span>${platformFee.toFixed(2)}</span></div>
            <hr className="border-white/5 !my-4" />
            <div className="flex justify-between text-[16px] font-bold">
              <span>Total</span>
              <span className="accent-value text-glow">${total.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        {/* Payment */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="glass p-6 rounded-2xl mb-6">
          <p className="label-text mb-4 tracking-[0.1em]">PAY WITH</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => setPayMethod("fiat")} className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all duration-300 text-[13px] font-mono ${payMethod === "fiat" ? "border-accent/40 bg-accent/10 text-accent shadow-[0_4px_30px_rgba(206,202,251,0.1)]" : "border-white/8 text-white/45 hover:border-white/15"}`}>
              <CreditCard className="w-4 h-4" /> Card / Bank
            </button>
            <button onClick={() => setPayMethod("crypto")} className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all duration-300 text-[13px] font-mono ${payMethod === "crypto" ? "border-accent/40 bg-accent/10 text-accent shadow-[0_4px_30px_rgba(206,202,251,0.1)]" : "border-white/8 text-white/45 hover:border-white/15"}`}>
              <Wallet className="w-4 h-4" /> Wallet
            </button>
          </div>

          {payMethod === "fiat" ? (
            <div className="space-y-4">
              <div>
                <label className="label-text mb-2 block">CARD NUMBER</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text mb-2 block">EXPIRY</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label className="label-text mb-2 block">CVV</label>
                  <input
                    type="text"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Token selector */}
              <div>
                <label className="label-text mb-2 block">PAY WITH TOKEN</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["USDC", "USDT"] as const).map((token) => {
                    const isSelected = payToken === token;
                    const bal = wallet.tokens.find((t) => t.symbol === token);
                    const balVal = bal ? parseFloat(bal.balance) : 0;
                    const icon = token === "USDC" ? "/tokens/usdc.png" : "/tokens/usdt.png";

                    return (
                      <button
                        key={token}
                        onClick={() => setPayToken(token)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? "border-accent/40 bg-accent/10 shadow-[0_4px_30px_rgba(206,202,251,0.1)]"
                            : "border-white/8 hover:border-white/15"
                        }`}
                      >
                        <img src={icon} alt={token} className="w-7 h-7 rounded-full" />
                        <div className="text-left">
                          <p className={`text-[13px] font-mono font-medium ${isSelected ? "text-accent" : "text-white/50"}`}>
                            {token}
                          </p>
                          <p className="text-[10px] font-mono text-white/40">
                            {balVal > 0 ? `${balVal.toFixed(2)} available` : "0.00"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet info */}
              {wallet.connected ? (
                <div className="glass p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img src="/tokens/celo.svg" alt="Celo" className="w-8 h-8" />
                    <div className="flex-1">
                      <p className="text-[13px] font-mono text-white">{wallet.shortAddress}</p>
                      <p className="text-[11px] font-mono text-white/45">
                        Celo · {wallet.balance ?? "0"} CELO
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <p className="text-[11px] font-mono text-white/45">
                      Paying <span className="text-white/60">${total.toFixed(2)}</span> in <span className="text-white/60">{payToken}</span>
                    </p>
                    {!hasEnough && tokenBal >= 0 && (
                      <button
                        onClick={handleFaucet}
                        disabled={faucetLoading || faucetDone}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-[#35D07F]/10 text-[#35D07F] border border-[#35D07F]/20 hover:bg-[#35D07F]/20 transition-colors disabled:opacity-50"
                      >
                        {faucetDone ? "✓ 1000 USDC Minted" : faucetLoading ? "Minting..." : "Get Test USDC"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Wallet className="w-8 h-8 text-accent mx-auto mb-4" />
                  <p className="text-[13px] font-mono text-white/45 mb-4">Connect your wallet to pay with {payToken}</p>
                  <button
                    onClick={wallet.openModal}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-accent/25 text-[13px] font-mono text-accent hover:border-accent/40 transition-all duration-300"
                  >
                    <Wallet className="w-4 h-4" /> Connect Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Delivery */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="glass p-6 rounded-2xl mb-6">
          <p className="label-text mb-4 tracking-[0.1em]">DELIVERY</p>
          {isSteam ? (
            <div>
              <label className="label-text mb-2 block">STEAM TRADE URL</label>
              <input
                type="text"
                value={steamTradeUrl}
                onChange={(e) => setSteamTradeUrl(e.target.value)}
                placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
              />
              <p className="text-[11px] text-white/50 mt-2 font-mono">Item sent via Steam trade offer.</p>
            </div>
          ) : isDigital ? (
            <div>
              <label className="label-text mb-2 block">EMAIL ADDRESS</label>
              <input
                type="email"
                value={deliveryEmail}
                onChange={(e) => setDeliveryEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
              />
              <p className="text-[11px] text-white/50 mt-2 font-mono">Digital key or download link will be sent to this email.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={address.street}
                onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                placeholder="Street address"
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  placeholder="City"
                  className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                />
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                  placeholder="State"
                  className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                />
                <input
                  type="text"
                  value={address.zip}
                  onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
                  placeholder="ZIP"
                  className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-accent/30 transition-colors duration-300"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Escrow */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} className="glass p-6 rounded-2xl mb-8 border border-accent/10">
          <p className="label-text mb-4 tracking-[0.1em] flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-accent" />ESCROW PROTECTION</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Lock className="w-4 h-4 text-neon-green/60" /><span className="text-[13px] font-mono text-white/50">Payment held in smart contract escrow</span></div>
            <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-neon-green/60" /><span className="text-[13px] font-mono text-white/50">Released only on delivery confirmation</span></div>
            <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-neon-green/60" /><span className="text-[13px] font-mono text-white/50">Auto-refund if undelivered in 14 days</span></div>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-white/50 font-mono"><FileText className="w-3 h-3" />Contract deployed on purchase</div>
          </div>
        </motion.div>

        {/* On-Chain Transaction Steps */}
        {txStep !== "idle" && payMethod === "crypto" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-2xl mb-6 border border-accent/10"
          >
            <p className="label-text mb-4 tracking-[0.1em] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-accent" />ON-CHAIN TRANSACTION
            </p>
            <div className="space-y-3">
              {[
                { key: "creating", label: "Create escrow on-chain", hash: txHashes.escrow },
                { key: "approving", label: "Approve USDC spending", hash: txHashes.approve },
                { key: "funding", label: "Fund escrow contract", hash: txHashes.fund },
                { key: "confirming", label: "Confirm order", hash: undefined },
              ].map((step, i) => {
                const steps = ["creating", "approving", "funding", "confirming", "done"];
                const currentIdx = steps.indexOf(txStep);
                const stepIdx = steps.indexOf(step.key);
                const isDone = stepIdx < currentIdx;
                const isActive = step.key === txStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDone ? "bg-neon-green/20 text-neon-green" : isActive ? "bg-accent/20 text-accent animate-pulse" : "bg-white/5 text-white/50"}`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <span className={`text-[12px] font-mono ${isDone ? "text-neon-green/70" : isActive ? "text-accent" : "text-white/40"}`}>{step.label}</span>
                      {step.hash && (
                        <a
                          href={`https://sepolia.celoscan.io/tx/${step.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[10px] font-mono text-accent/40 hover:text-accent/70 transition-colors truncate"
                        >
                          {step.hash}
                        </a>
                      )}
                    </div>
                    {isActive && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                    {isDone && <CheckCircle2 className="w-4 h-4 text-neon-green/60" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Agent Events */}
        <AnimatePresence>
          {purchaseEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="glass p-4 rounded-2xl space-y-2">
                <p className="label-text tracking-[0.1em] flex items-center gap-2 mb-3">
                  <Bot className="w-3.5 h-3.5 text-accent" /> AGENT ACTIVITY
                </p>
                {purchaseEvents.slice(-6).map((event, i) => {
                  const label =
                    (event.data?.thought as string) ??
                    (event.data?.tool as string) ??
                    (event.data?.message as string) ??
                    (event.data?.status as string) ??
                    event.type;
                  return (
                    <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-accent/60">{event.agent}</span>
                      <span className="text-white/50">→</span>
                      <span className="text-white/40">{typeof label === "string" ? label : event.type}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {purchaseError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/15"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-[13px] font-mono text-red-400/80">{purchaseError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.5 }}>
          <button
            onClick={handlePurchase}
            disabled={!canPurchase}
            className="w-full py-5 rounded-2xl text-[15px] font-bold font-mono bg-accent/15 border border-accent/25 text-accent hover:bg-accent/25 hover:shadow-[0_4px_60px_rgba(206,202,251,0.2)] transition-all duration-500 relative overflow-hidden group disabled:opacity-30 disabled:hover:shadow-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="flex items-center justify-center gap-2 relative z-10">
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AGENTS PROCESSING...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  PAY ${total.toFixed(2)} {payMethod === "crypto" ? `in ${payToken}` : ""} — SECURED BY ESCROW
                </>
              )}
            </span>
          </button>
          <p className="text-center text-[11px] text-white/50 mt-4 font-mono">
            {payMethod === "crypto" && wallet.connected
              ? `Paying ${payToken} from ${wallet.shortAddress} on Celo`
              : "Powered by Dro Protocol"}
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white/50 font-mono text-[13px]">Loading...</div></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
