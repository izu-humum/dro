"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Star,
  ShieldCheck,
  Shield,
  AlertTriangle,
  ChevronDown,
  Send,
  Zap,
  TrendingUp,
  Loader2,
  Bot,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Sparkline from "@/components/Sparkline";
import OakCampaigns from "@/components/OakCampaigns";
import type { Product } from "@/lib/mockData";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "CS2 AWP Asiimov";
  const [refinement, setRefinement] = useState("");
  const [sortBy, setSortBy] = useState<"best" | "price_low" | "price_high" | "rating">("best");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Always fetch from agent API
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMeta, setSearchMeta] = useState<{
    sources: number;
    timeMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [refinedQuery, setRefinedQuery] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string>("us");

  // Detect user location once
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const regionMap: Record<string, string> = {
        "America/": "us", "US/": "us", "Canada/": "ca",
        "Europe/London": "uk", "Europe/": "de",
        "Asia/Kolkata": "in", "Asia/Calcutta": "in", "Asia/Karachi": "pk",
        "Asia/Dhaka": "bd", "Asia/Tokyo": "jp", "Asia/Shanghai": "cn",
        "Asia/Dubai": "ae", "Asia/Riyadh": "sa",
        "Australia/": "au", "Pacific/Auckland": "nz",
      };
      for (const [prefix, code] of Object.entries(regionMap)) {
        if (tz.startsWith(prefix) || tz === prefix) { setUserRegion(code); break; }
      }
    } catch { /* keep default */ }
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setSuggestions(null);
    setClarification(null);
    setRefinedQuery(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, maxResults: 30, region: userRegion }),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();

      // AI-powered response metadata
      if (data.aiSummary) setAiSummary(data.aiSummary);
      if (data.suggestions) setSuggestions(data.suggestions);
      if (data.clarification) setClarification(data.clarification);
      if (data.refinedQuery) setRefinedQuery(data.refinedQuery);

      const mapped: Product[] = (data.results ?? []).map(
        (p: Record<string, unknown>, i: number) => ({
          id: (p.id as string) ?? `r_${i}`,
          name: (p.name as string) ?? "Unknown",
          source: (p.source as string) ?? "Unknown",
          sourceIcon: (p.sourceIcon as string) ?? ((p.source as string) ?? "?")[0],
          price: (p.price as number) ?? 0,
          originalPrice: p.originalPrice as number | undefined,
          rating: Math.round(((p.rating as number) ?? 4.0) * 10) / 10,
          reviews: (p.reviews as number) ?? 0,
          image: (p.image as string) ?? "",
          tier: (p.tier as Product["tier"]) ?? "marketplace",
          priceHistory: (p.priceHistory as number[]) ?? [],
          tags: (p.tags as string[]) ?? [],
          delivery: (p.delivery as string) ?? "Standard",
          float: p.float as number | undefined,
          wear: p.wear as string | undefined,
          inStock: (p.inStock as boolean) ?? true,
        }),
      );

      setProducts(mapped);
      setSearchMeta({
        sources: data.totalSources ?? 0,
        timeMs: data.searchTimeMs ?? 0,
      });
    } catch (err) {
      console.error("[DRO] Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and whenever query changes
  useEffect(() => {
    if (query) fetchResults(query);
  }, [query, fetchResults]);

  const tierGroups = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      switch (sortBy) {
        case "price_low": return a.price - b.price;
        case "price_high": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        default: return 0;
      }
    });
    return {
      verified: sorted.filter((p) => p.tier === "verified"),
      trusted: sorted.filter((p) => p.tier === "trusted"),
      marketplace: sorted.filter((p) => p.tier === "marketplace"),
    };
  }, [sortBy, products]);

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="hue-overlay" />
      <Navbar />

      <main className="relative z-10 pt-28 pb-36 px-6 max-w-[1000px] mx-auto">
        {/* Search header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-white/60 text-[14px] mb-2">
                <Search className="w-4 h-4" />
                <span className="font-mono">&quot;{query}&quot;</span>
              </div>
              <p className="text-[13px] font-mono text-white/50">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                    <span>Agents searching across sources...</span>
                  </span>
                ) : error ? (
                  <span className="text-red-400">{error}</span>
                ) : (
                  <>
                    Found <span className="accent-value">{products.length}</span> results
                    from <span className="accent-value">{searchMeta?.sources ?? 0}</span> sources
                    <span className="ml-2 text-white/50">
                      · {searchMeta?.timeMs ?? 0}ms
                      <span className="inline-flex items-center gap-1 ml-2 text-accent/60">
                        <Bot className="w-3 h-3" /> live
                      </span>
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Sort */}
            {!loading && (
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="glass flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-mono text-white/50 hover:text-white transition-all duration-300"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === "best" ? "Best Match" : sortBy === "price_low" ? "Price ↑" : sortBy === "price_high" ? "Price ↓" : "Rating"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-2 glass-strong rounded-xl p-1 min-w-[150px] z-50"
                    >
                      {([["best", "Best Match"], ["price_low", "Price ↑"], ["price_high", "Price ↓"], ["rating", "Top Rated"]] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => { setSortBy(val); setShowSortMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-mono transition-all duration-200 ${sortBy === val ? "accent-value bg-accent/10" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Clarification + Refined Query Banner */}
        {(clarification || refinedQuery) && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-4"
          >
            <div className="glass rounded-2xl p-4 border border-warning/10">
              <div className="flex items-start gap-3">
                <Bot className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-mono text-white/60 leading-relaxed">
                    {clarification || `Showing results for "${refinedQuery}".`}
                  </p>
                  {refinedQuery && (
                    <button
                      onClick={() => router.push(`/results?q=${encodeURIComponent(query)}`)}
                      className="text-[12px] font-mono text-accent/60 hover:text-accent mt-1 transition-colors"
                    >
                      Search for &quot;{query}&quot; instead
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Suggestions */}
        {suggestions && suggestions.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-8"
          >
            <div className="glass rounded-2xl p-5 border border-accent/10">
              <p className="text-[12px] font-mono text-white/45 mb-3">Did you mean:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => router.push(`/results?q=${encodeURIComponent(s)}`)}
                    className="px-4 py-2.5 rounded-xl glass text-[13px] font-mono text-white/60 hover:text-accent hover:border-accent/25 border border-transparent transition-all duration-300 hover:bg-accent/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Summary */}
        {aiSummary && !loading && !suggestions?.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-8"
          >
            <div className="glass rounded-2xl p-5 border border-neon-cyan/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/12 border border-neon-cyan/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-accent-bright" />
                </div>
                <p className="text-[13px] font-mono text-white/60 leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 mb-10"
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-28 h-20 rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-white/5" />
                    <div className="h-3 w-1/3 rounded bg-white/3" />
                    <div className="h-6 w-24 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
            <div className="text-center pt-4">
              <div className="inline-flex items-center gap-2 text-[12px] font-mono text-accent/50">
                <Bot className="w-4 h-4 animate-pulse" />
                9 agents searching across 5+ sources...
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {!loading && (
          <>
            <TierSection
              title="VERIFIED"
              icon={<ShieldCheck className="w-3.5 h-3.5 text-neon-green" />}
              tierClass="tier-verified"
              products={tierGroups.verified}
              router={router}
              delay={0.1}
            />
            <TierSection
              title="TRUSTED"
              icon={<Shield className="w-3.5 h-3.5 text-neon-blue" />}
              tierClass="tier-trusted"
              products={tierGroups.trusted}
              router={router}
              delay={0.2}
            />
            <TierSection
              title="MARKETPLACE"
              icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />}
              tierClass="tier-marketplace"
              products={tierGroups.marketplace}
              router={router}
              delay={0.3}
              warning
            />

            {/* Oak Network Campaigns */}
            <OakCampaigns />

            {products.length === 0 && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="glass rounded-2xl p-10 max-w-lg mx-auto">
                  <Search className="w-10 h-10 text-white/45 mx-auto mb-4" />
                  <h3 className="text-[16px] font-sans font-medium text-white/70 mb-2">
                    Can&apos;t find &quot;{query}&quot;
                  </h3>
                  <p className="text-[13px] font-mono text-white/40 mb-6">
                    Try being more specific so our agents can find exactly what you need.
                  </p>
                  <div className="space-y-2 mb-6">
                    {[
                      { bad: `"game"`, good: `"laptop"`, label: "or a specific product" },
                      { bad: `"stuff"`, good: `"Nike Air Max shoes"`, label: "try brand + product" },
                      { bad: `"electronics"`, good: `"iPhone 15 Pro"`, label: "be precise" },
                    ].map(({ bad, good, label }) => (
                      <div key={bad} className="flex items-center justify-center gap-3 text-[12px] font-mono">
                        <span className="text-red-400/50 line-through">{bad}</span>
                        <span className="text-white/50">→</span>
                        <button
                          onClick={() => router.push(`/results?q=${encodeURIComponent(good.replace(/"/g, ""))}`)}
                          className="text-accent/70 hover:text-accent transition-colors cursor-pointer"
                        >
                          {good}
                        </button>
                        <span className="text-white/50">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] font-mono text-white/50">
                    Works best with: laptops, phones, bags, shoes, watches, perfume, furniture, skincare, tablets, sunglasses
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Search bar */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-0 left-0 right-0 z-[200] p-4"
      >
        <div className="max-w-2xl mx-auto">
          <div>
            <div className="glass-strong rounded-2xl flex items-center p-2">
              <div className="pl-3 pr-2">
                <Search className="w-4 h-4 text-white/50" />
              </div>
              <input
                type="text"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const r = refinement.trim();
                    if (r) {
                      router.push(`/results?q=${encodeURIComponent(r)}`);
                      setRefinement("");
                    }
                  }
                }}
                placeholder="New search..."
                className="flex-1 bg-transparent py-3 text-[13px] text-white placeholder:text-white/35 focus:outline-none font-mono"
              />
              <button
                onClick={() => {
                  const r = refinement.trim();
                  if (r) {
                    router.push(`/results?q=${encodeURIComponent(r)}`);
                    setRefinement("");
                  }
                }}
                className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/25 transition-all duration-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <SearchQueryHint query={refinement} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TierSection({ title, icon, tierClass, products, router, delay, warning }: {
  title: string; icon: React.ReactNode; tierClass: string;
  products: Product[]; router: ReturnType<typeof useRouter>;
  delay: number; warning?: boolean;
}) {
  const INITIAL_COUNT = 5;
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const hasMore = products.length > visibleCount;
  const visible = products.slice(0, visibleCount);

  if (products.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono tracking-wider ${tierClass}`}>
          {icon}
          <span>TIER — {title}</span>
          {warning && <span className="text-warning/50 ml-1">Verify seller</span>}
        </div>
        <span className="text-[11px] font-mono text-white/40">{products.length} results</span>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {visible.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              onClick={() => router.push(`/checkout?id=${product.id}&name=${encodeURIComponent(product.name)}&price=${product.price}&source=${encodeURIComponent(product.source)}&float=${product.float || ""}`)}
            />
          ))}
        </AnimatePresence>
      </div>
      {hasMore && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setVisibleCount(products.length)}
          className="w-full mt-4 py-3 rounded-xl border border-white/8 text-[12px] font-mono text-white/40 hover:text-white/60 hover:border-white/15 hover:bg-white/[0.02] transition-all duration-300"
        >
          Show {products.length - visibleCount} more results
        </motion.button>
      )}
      {!hasMore && visibleCount > INITIAL_COUNT && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setVisibleCount(INITIAL_COUNT)}
          className="w-full mt-4 py-3 rounded-xl border border-white/8 text-[12px] font-mono text-white/40 hover:text-white/40 hover:border-white/15 transition-all duration-300"
        >
          Show less
        </motion.button>
      )}
    </motion.section>
  );
}

function proxyImg(url: string): string {
  if (!url) return "";
  if (url.startsWith("/")) return url; // local
  if (url.startsWith("data:")) return url; // base64 data URIs — use directly
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function ProductCard({ product, index, onClick }: { product: Product; index: number; onClick: () => void }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(product.rating));
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        onClick={onClick}
        className="glass rounded-2xl overflow-hidden cursor-pointer group hover:bg-glass-hover hover:shadow-[0_4px_40px_rgba(206,202,251,0.06)] transition-all duration-500"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
            {product.image ? (
              <img
                src={proxyImg(product.image)}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.querySelector(".fallback-icon")?.classList.remove("hidden"); }}
              />
            ) : null}
            <div className={`fallback-icon text-2xl font-black text-white/5 absolute inset-0 flex items-center justify-center ${product.image ? "hidden" : ""}`}>{product.sourceIcon}</div>
          </div>
          <div className="flex-1 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-[15px] font-sans font-medium text-white mb-1">{product.name}</h3>
                <p className="text-[12px] font-mono text-white/50 mb-3">{product.source}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xl font-bold font-mono accent-value text-glow">${product.price.toFixed(2)}</span>
                  {product.originalPrice && <span className="text-[12px] text-white/50 line-through font-mono">${product.originalPrice.toFixed(2)}</span>}
                  {product.float !== undefined && (
                    <span className="text-[11px] font-mono text-white/45 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-accent" />Float: {product.float.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-0.5">
                    {stars.map((filled, i) => (
                      <Star key={i} className={`w-3 h-3 ${filled ? "text-warning fill-warning" : "text-white/45"}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/40 font-mono">({product.reviews.toLocaleString()})</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                {product.priceHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-white/50" />
                    <Sparkline data={product.priceHistory} width={100} height={28} />
                  </div>
                )}
                <span className="text-[11px] text-white/45 font-mono">{product.delivery}</span>
                <div className="flex gap-2">
                  <button className="btn-primary !py-2 !px-4 !text-[12px]">Buy Now</button>
                </div>
              </div>
            </div>
            {product.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {product.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-white/40 border border-white/8">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SearchQueryHint({ query }: { query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const count = words.length;
  if (query.length === 0) return null;

  const hint = (() => {
    if (count === 1 && query.length <= 5)
      return { color: "text-red-400/50", text: "Too vague — try 2-3 words" };
    if (count === 1)
      return { color: "text-warning/50", text: "Add a brand or type for better results" };
    if (count === 2)
      return { color: "text-neon-green/40", text: "Good query" };
    return { color: "text-neon-green/50", text: "Specific queries get the best results" };
  })();

  return (
    <div className={`text-[10px] font-mono ${hint.color} mt-2 px-2 text-center`}>
      {hint.text}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/45 font-mono text-[13px]">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          Initializing agents...
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
