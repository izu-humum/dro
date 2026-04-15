"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Wrench,
  ArrowLeft,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface HealthResult {
  name: string;
  status: "pass" | "fail" | "warn";
  responseTime: number;
  statusCode?: number;
  error?: string;
  fix?: string;
  details?: string;
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy" | "error";
  summary?: { total: number; passed: number; failed: number; warned: number };
  results?: HealthResult[];
  timestamp?: string;
  error?: string;
}

const statusConfig = {
  healthy: { icon: <CheckCircle2 className="w-8 h-8" />, color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/20", label: "All Systems Operational" },
  degraded: { icon: <AlertTriangle className="w-8 h-8" />, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", label: "Degraded Performance" },
  unhealthy: { icon: <XCircle className="w-8 h-8" />, color: "text-danger", bg: "bg-danger/10", border: "border-danger/20", label: "System Issues Detected" },
  error: { icon: <XCircle className="w-8 h-8" />, color: "text-danger", bg: "bg-danger/10", border: "border-danger/20", label: "Health Check Failed" },
};

const checkStatusIcon = {
  pass: <CheckCircle2 className="w-4 h-4 text-neon-green" />,
  fail: <XCircle className="w-4 h-4 text-danger" />,
  warn: <AlertTriangle className="w-4 h-4 text-warning" />,
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
    } catch {
      setData({ status: "error", error: "Failed to reach health endpoint" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const config = statusConfig[data?.status ?? "error"];

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="hue-overlay" />

      <main className="relative z-10 pt-12 pb-16 px-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-[13px] font-mono text-white/45 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <button
            onClick={runChecks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[12px] font-mono text-white/40 hover:text-white/60 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Running..." : "Re-run"}
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-accent" />
            <h1 className="text-[22px] font-sans font-medium text-white">System Health</h1>
          </div>
          <p className="text-[12px] font-mono text-white/45">
            End-to-end health monitoring across the full user journey
          </p>
        </div>

        {/* Loading */}
        {loading && !data && (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
            <p className="text-[13px] font-mono text-white/45">Running 14 health checks...</p>
          </div>
        )}

        {/* Status Banner */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${config.bg} border ${config.border} rounded-2xl p-6 mb-8 text-center`}
          >
            <div className={`${config.color} flex items-center justify-center gap-3 mb-2`}>
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : config.icon}
              <span className="text-[18px] font-sans font-semibold">{config.label}</span>
            </div>
            {data.summary && (
              <p className="text-[13px] font-mono text-white/40">
                {data.summary.passed}/{data.summary.total} checks passed
                {data.summary.failed > 0 && <span className="text-danger"> · {data.summary.failed} failed</span>}
                {data.summary.warned > 0 && <span className="text-warning"> · {data.summary.warned} warnings</span>}
              </p>
            )}
            {data.timestamp && (
              <p className="text-[10px] font-mono text-white/50 mt-2">
                Last checked: {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        )}

        {/* Results */}
        {data?.results && (
          <div className="space-y-2">
            {data.results.map((result, i) => (
              <motion.div
                key={result.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => setExpanded(expanded === result.name ? null : result.name)}
                  className={`w-full glass rounded-xl p-4 text-left transition-all duration-300 ${
                    result.status === "fail" ? "border border-danger/20" : result.status === "warn" ? "border border-warning/10" : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {checkStatusIcon[result.status]}
                      <span className="text-[13px] font-mono text-white/70">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {result.responseTime}ms
                      </span>
                      {result.statusCode && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          result.statusCode === 200 ? "text-neon-green/60 bg-neon-green/5" : "text-danger/60 bg-danger/5"
                        }`}>
                          {result.statusCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expanded === result.name && (result.error || result.fix) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 space-y-2"
                      >
                        {result.error && (
                          <p className="text-[12px] font-mono text-danger/70">{result.error}</p>
                        )}
                        {result.fix && (
                          <div className="flex items-start gap-2 bg-accent/5 rounded-lg p-3">
                            <Wrench className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] font-mono text-accent/70">{result.fix}</p>
                          </div>
                        )}
                        {result.details && (
                          <p className="text-[10px] font-mono text-white/50 break-all">{result.details}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-white/50">
            <Shield className="w-3 h-3" />
            Powered by DRO Health Monitor Agent (A2A)
          </div>
        </div>
      </main>
    </div>
  );
}
