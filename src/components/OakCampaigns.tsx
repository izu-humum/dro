"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addHistory, getPledgedCampaignIds } from "@/lib/history";
import { useWallet } from "@/lib/wallet/context";
import {
  ExternalLink,
  Users,
  Clock,
  CheckCircle,
  Rocket,
  Sparkles,
  X,
  Loader2,
  CircleDollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface OakCampaign {
  id: string;
  title: string;
  subtitle: string;
  status: "LAUNCHED" | "SUCCESSFUL" | "DRAFT" | "ENDED";
  category: string;
  fundingGoal: string;
  funded: string;
  launchDate: string;
  endDate: string;
  contractAddress: string;
  campaignTreasury: string;
  projectImageUrl: string;
  pledgeCount?: string;
  fiatEnabled: boolean;
  projectType: string;
}

// No more hardcoded campaigns — fetched live from /api/oak/campaigns

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: OakCampaign["status"] }) {
  if (status === "LAUNCHED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-neon-green/20 text-neon-green border border-neon-green/30 shadow-[0_0_12px_rgba(74,222,128,0.3)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
        </span>
        LIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-accent/10 text-accent/70 border border-accent/15">
      <CheckCircle className="w-2.5 h-2.5" />
      FUNDED
    </span>
  );
}

function FundingBar({ goal, funded }: { goal: number; funded: number }) {
  const percent = goal > 0 ? Math.min((funded / goal) * 100, 100) : 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] font-mono text-white/60 mb-1">
        <span>${funded.toFixed(2)} raised</span>
        {goal > 0 && <span>of ${goal.toFixed(2)}</span>}
      </div>
      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-neon-green/60"
        />
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function daysLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.ceil(diff / 86400000);
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// ---------------------------------------------------------------------------
// Pledge Modal
// ---------------------------------------------------------------------------

interface PledgeLog {
  status: string;
  step?: string;
  message?: string;
}

interface OakReward {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number | null;
  estimatedDelivery: string;
  shippingType: string;
}

function PledgeModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: OakCampaign;
  onClose: () => void;
  onSuccess: (amount: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [pledging, setPledging] = useState(false);
  const [logs, setLogs] = useState<PledgeLog[]>([]);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [rewards, setRewards] = useState<OakReward[]>([]);
  const [selectedReward, setSelectedReward] = useState<OakReward | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [campaignDetail, setCampaignDetail] = useState<Record<string, unknown> | null>(null);

  // Fetch campaign details + rewards
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/oak/campaigns/${campaign.id}`);
        if (res.ok) {
          const data = await res.json();
          setRewards(data.rewards ?? []);
          if (data.campaign) setCampaignDetail(data.campaign);
        }
      } catch {
        // Silently fail — modal still works without rewards
      } finally {
        setLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [campaign.id]);

  // When a reward is selected, set amount to reward price
  const selectReward = useCallback((reward: OakReward | null) => {
    setSelectedReward(reward);
    if (reward) {
      setAmount(String(reward.price));
    } else {
      setAmount("");
    }
  }, []);

  const handlePledge = useCallback(async () => {
    setPledging(true);
    setLogs([]);
    setResult(null);

    try {
      const res = await fetch("/api/oak/pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: campaign.id,
          title: campaign.title,
          amount: amount || "0",
        }),
      });

      if (!res.body) {
        setResult("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const entry = JSON.parse(line.slice(6)) as PledgeLog & {
              status: string;
              exitCode?: number;
            };

            if (entry.status === "stream-end") {
              if (!gotDone) setResult("error");
              break;
            }

            if (entry.status === "done") {
              gotDone = true;
              setResult("success");
            }

            if (entry.status === "error") {
              setResult("error");
            }

            if (entry.status === "progress" || entry.status === "error") {
              setLogs((prev) => [...prev, entry]);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (!gotDone && result !== "error") {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setPledging(false);
    }
  }, [campaign.id, campaign.title, amount]);

  const funded = parseFloat((campaignDetail?.funded as string) || campaign.funded);
  const goal = parseFloat((campaignDetail?.fundingGoal as string) || campaign.fundingGoal);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pledging) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative glass-strong rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-[15px] font-sans font-medium text-white">
                Back this Campaign
              </h3>
              <p className="text-[12px] font-mono text-white/70">
                via DRO Automation
              </p>
            </div>
          </div>
          {!pledging && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Campaign Card */}
        <div className="glass rounded-xl overflow-hidden mb-4">
          <div className="h-32 bg-gradient-to-br from-surface-2 to-surface-3 relative overflow-hidden">
            <img
              src={campaign.projectImageUrl}
              alt={campaign.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="absolute top-2 left-2">
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          <div className="p-3.5">
            <h4 className="text-[14px] font-sans font-medium text-white mb-0.5">
              {campaign.title}
            </h4>
            <p className="text-[11px] font-mono text-white/60 mb-2">
              {campaign.subtitle}
            </p>
            <FundingBar goal={goal} funded={funded} />
          </div>
        </div>

        {!result && (
          <>
            {/* Rewards Section */}
            {loadingDetails ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-accent/50" />
                <span className="ml-2 text-[12px] font-mono text-white/40">Loading rewards...</span>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-[12px] font-mono text-white/70 mb-2">Select a reward</p>

                {/* No Reward option */}
                <button
                  onClick={() => selectReward(null)}
                  className={`w-full text-left glass rounded-xl p-3 mb-2 border transition-all duration-200 ${
                    selectedReward === null
                      ? "border-accent/30 bg-accent/5"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedReward === null ? "border-accent" : "border-white/20"
                    }`}>
                      {selectedReward === null && (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-sans text-white/90">Pledge without reward</p>
                      <p className="text-[11px] font-mono text-white/45">Enter any amount (min $0.01)</p>
                    </div>
                  </div>
                </button>

                {/* Reward options */}
                {rewards.map((reward) => (
                  <button
                    key={reward.id}
                    onClick={() => selectReward(reward)}
                    className={`w-full text-left glass rounded-xl p-3 mb-2 border transition-all duration-200 ${
                      selectedReward?.id === reward.id
                        ? "border-accent/30 bg-accent/5"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedReward?.id === reward.id ? "border-accent" : "border-white/20"
                      }`}>
                        {selectedReward?.id === reward.id && (
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        )}
                      </div>
                      {reward.image && (
                        <img
                          src={reward.image}
                          alt={reward.name}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-sans text-white/90 truncate">{reward.name}</p>
                          <span className="text-[13px] font-mono text-accent font-medium flex-shrink-0">${reward.price}</span>
                        </div>
                        <p className="text-[11px] font-mono text-white/70 mt-0.5 line-clamp-2">{reward.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-mono text-white/70">
                            {reward.shippingType === "digital" ? "Digital delivery" : reward.shippingType}
                          </span>
                          {reward.estimatedDelivery && (
                            <span className="text-[10px] font-mono text-white/70">
                              Est. {new Date(reward.estimatedDelivery).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-4">
              <label className="text-[12px] font-mono text-white/70 mb-2 block">
                {selectedReward ? "Pledge Amount" : "Pledge Amount (USD)"}
              </label>
              <div className="glass rounded-xl flex items-center p-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pledging || !!selectedReward}
                  className="flex-1 bg-transparent py-2.5 px-3 text-[15px] text-white font-mono focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Pledge Button */}
            <button
              onClick={handlePledge}
              disabled={pledging || (!selectedReward && (!amount || parseFloat(amount) <= 0))}
              className="w-full py-3 rounded-xl bg-accent/15 border border-accent/25 text-accent font-mono text-[13px] font-medium hover:bg-accent/25 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pledging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pledging via automation...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  {selectedReward
                    ? `Pledge $${selectedReward.price} — ${selectedReward.name}`
                    : `Pledge $${amount || "0"}`}
                </>
              )}
            </button>
          </>
        )}

        {/* Progress Logs */}
        {pledging && (
          <div className="mt-4 glass rounded-xl p-3 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-3 h-3 animate-spin text-accent/60" />
              <p className="text-[11px] font-mono text-white/70">
                Live Progress
              </p>
            </div>
            {logs.length === 0 ? (
              <div className="flex items-center gap-2 text-[11px] font-mono text-white/45">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" />
                Connecting to automation...
              </div>
            ) : (
              <div className="space-y-1">
                {logs
                  .filter((l) => l.status === "progress" || l.status === "error")
                  .map((log, i, arr) => {
                    const isLatest = i === arr.length - 1;
                    const isError = log.status === "error";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: isLatest ? 1 : 0.5, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2 text-[11px] font-mono"
                      >
                        <span className={`flex-shrink-0 ${isError ? "text-red-400" : isLatest ? "text-accent" : "text-accent/40"}`}>
                          {isError ? "✗" : isLatest ? "●" : "✓"} [{log.step}]
                        </span>
                        <span className={isError ? "text-red-400/80" : isLatest ? "text-white/80" : "text-white/40"}>
                          {log.message}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {result === "success" && (
          <SuccessAutoClose amount={amount} campaign={campaign} onSuccess={onSuccess} />
        )}

        {/* Error */}
        {result === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div className="glass rounded-xl p-5 text-center border border-red-500/15">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h4 className="text-[15px] font-sans font-medium text-white mb-4">
                Failed, try again
              </h4>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setResult(null);
                    setLogs([]);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[12px] font-mono hover:bg-accent/20 transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[12px] font-mono hover:bg-white/10 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Success Auto-Close (inside modal — triggers toast and closes)
// ---------------------------------------------------------------------------

function SuccessAutoClose({
  amount,
  campaign,
  onSuccess,
}: {
  amount: string;
  campaign: OakCampaign;
  onSuccess: (amount: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onSuccess(amount), 1500);
    return () => clearTimeout(timer);
  }, [amount, onSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <div className="glass rounded-xl p-5 text-center border border-neon-green/15">
        <CheckCircle2 className="w-10 h-10 text-neon-green mx-auto mb-3" />
        <h4 className="text-[15px] font-sans font-medium text-white mb-1">
          Pledge Successful!
        </h4>
        <p className="text-[12px] font-mono text-white/40">
          ${amount} pledged to {campaign.title}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Success Toast
// ---------------------------------------------------------------------------

function SuccessToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] max-w-md w-full px-4"
    >
      <div className="glass-strong rounded-2xl p-4 border border-neon-green/20 shadow-[0_8px_40px_rgba(74,222,128,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neon-green/15 border border-neon-green/25 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-neon-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-sans font-medium text-white">
              Pledge Successful!
            </p>
            <p className="text-[11px] font-mono text-white/40 truncate">
              {message}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Auto-dismiss progress bar */}
        <div className="mt-3 w-full h-0.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 6, ease: "linear" }}
            className="h-full rounded-full bg-neon-green/40"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OakCampaigns() {
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<OakCampaign[]>([]);
  const [pledgeCampaign, setPledgeCampaign] = useState<OakCampaign | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [pledgedIds, setPledgedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  // Load pledged IDs from history — re-run when wallet connects/disconnects
  useEffect(() => {
    setPledgedIds(getPledgedCampaignIds(wallet.address));
  }, [wallet.address]);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/oak/campaigns");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const live = (data.campaigns ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          title: c.title as string,
          subtitle: c.subtitle as string || "",
          status: (c.projectStatus as string) === "LAUNCHED" ? "LAUNCHED" : "SUCCESSFUL",
          category: (c.categoryName as string) || "Other",
          fundingGoal: (c.fundingGoal as string) || "0.00",
          funded: (c.funded as string) || "0.00",
          launchDate: (c.launchDate as string) || "",
          endDate: (c.endDate as string) || "",
          contractAddress: (c.contractAddress as string) || "",
          campaignTreasury: (c.campaignTreasury as string) || "",
          projectImageUrl: (c.projectImageUrl as string) || "",
          pledgeCount: c.pledgeCount as string | undefined,
          fiatEnabled: (c.fiatEnabled as boolean) ?? false,
          projectType: (c.projectType as string) || "INDIVIDUAL",
        })) as OakCampaign[];
        setCampaigns(live.sort((a, b) =>
          new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime()
        ));

        // Fetch each campaign's detail to get real funded amount for display
        await Promise.all(
          live.map(async (c: OakCampaign) => {
            try {
              const detailRes = await fetch(`/api/oak/campaigns/${c.id}`);
              if (!detailRes.ok) return;
              const detail = await detailRes.json();
              if (detail.campaign?.funded) {
                c.funded = detail.campaign.funded;
              }
            } catch { /* skip */ }
          })
        );
      } catch (err) {
        console.error("Failed to fetch Oak campaigns:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  if (loading || campaigns.length === 0) return null;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 mt-6"
      >
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono tracking-wider bg-accent/8 text-accent/70 border border-accent/12">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OAK NETWORK CAMPAIGNS</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-accent/10 to-transparent" />
          <a
            href="https://app-dev.oaknetwork.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-white/60 hover:text-accent transition-colors flex items-center gap-1"
          >
            View all <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-[12px] font-mono text-white/70 mb-4">
          You might also be interested in these live campaigns on Oak Network
        </p>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.6 + i * 0.08,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`glass rounded-xl overflow-hidden group hover:bg-glass-hover transition-all duration-500 ${
                campaign.status === "LAUNCHED"
                  ? "border border-neon-green/15 hover:shadow-[0_4px_30px_rgba(74,222,128,0.08)]"
                  : "hover:shadow-[0_4px_30px_rgba(206,202,251,0.04)]"
              }`}
            >
              {/* Image */}
              <a
                href={`https://app-dev.oaknetwork.org/backer/projects/${campaign.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="w-full h-28 bg-gradient-to-br from-surface-2 to-surface-3 relative overflow-hidden">
                  <img
                    src={campaign.projectImageUrl}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={campaign.status} />
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/50 text-white/70 backdrop-blur-sm">
                      {campaign.category}
                    </span>
                  </div>
                </div>
              </a>

              {/* Content */}
              <div className="p-3.5">
                <a
                  href={`https://app-dev.oaknetwork.org/backer/projects/${campaign.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h4 className="text-[13px] font-sans font-medium text-white mb-0.5 truncate group-hover:text-accent transition-colors">
                    {campaign.title}
                  </h4>
                </a>
                <p className="text-[11px] font-mono text-white/70 mb-3 truncate">
                  {campaign.subtitle}
                </p>

                <FundingBar
                  goal={parseFloat(campaign.fundingGoal)}
                  funded={parseFloat(campaign.funded)}
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
                    <Clock className="w-3 h-3" />
                    {campaign.status === "LAUNCHED"
                      ? daysLeft(campaign.endDate)
                      : timeAgo(campaign.endDate)}
                  </div>
                  {campaign.pledgeCount && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
                      <Users className="w-3 h-3" />
                      {campaign.pledgeCount} backers
                    </div>
                  )}
                  {campaign.fiatEnabled && (
                    <span className="text-[9px] font-mono text-neon-green/70 px-1.5 py-0.5 rounded bg-neon-green/8 border border-neon-green/15">
                      Fiat OK
                    </span>
                  )}
                </div>

                {/* Pledge Button */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  {pledgedIds.has(campaign.id) ? (
                    <div className="w-full py-2 rounded-lg bg-neon-green/8 border border-neon-green/15 text-neon-green/70 text-[11px] font-mono font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Already Pledged
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPledgeCampaign(campaign);
                      }}
                      className="w-full py-2 rounded-lg bg-accent/10 border border-accent/15 text-accent/70 text-[11px] font-mono font-medium hover:bg-accent/20 hover:text-accent hover:border-accent/25 transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      <Rocket className="w-3 h-3" />
                      Pledge via DRO
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Pledge Modal */}
      <AnimatePresence>
        {pledgeCampaign && (
          <PledgeModal
            campaign={pledgeCampaign}
            onClose={() => setPledgeCampaign(null)}
            onSuccess={(pledgedAmount) => {
              const c = pledgeCampaign;
              addHistory({
                type: "pledge",
                title: c.title,
                subtitle: c.subtitle,
                amount: parseFloat(pledgedAmount) || 0,
                currency: "USD",
                paymentMethod: "crypto",
                walletAddress: wallet.address ?? undefined,
                campaignId: c.id,
                image: c.projectImageUrl,
                source: "Oak Network",
              });
              setPledgedIds((prev) => new Set(prev).add(c.id));
              setPledgeCampaign(null);
              setToast(`$${pledgedAmount} pledged to ${c.title}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {toast && (
          <SuccessToast
            message={toast}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
