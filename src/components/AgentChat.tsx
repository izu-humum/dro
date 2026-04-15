"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useChat } from "@/lib/hooks/useAgent";
import type { StreamEvent } from "@/lib/agents/types";

function EventBadge({ event }: { event: StreamEvent }) {
  const colors: Record<string, string> = {
    thinking: "text-purple-400 bg-purple-400/10",
    tool_start: "text-cyan-400 bg-cyan-400/10",
    tool_end: "text-green-400 bg-green-400/10",
    message: "text-blue-400 bg-blue-400/10",
    status: "text-yellow-400 bg-yellow-400/10",
    error: "text-red-400 bg-red-400/10",
    products: "text-emerald-400 bg-emerald-400/10",
    order_update: "text-orange-400 bg-orange-400/10",
  };

  const data = event.data as Record<string, unknown>;
  const label =
    (data.thought as string) ??
    (data.tool as string) ??
    (data.message as string) ??
    (data.status as string) ??
    event.type;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${colors[event.type] ?? "text-gray-400 bg-gray-400/10"}`}
    >
      <Zap size={8} />
      {event.agent}: {typeof label === "string" ? label.slice(0, 50) : event.type}
    </span>
  );
}

export default function AgentChat() {
  const { loading, error, messages, events, send, reset } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showEvents, setShowEvents] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, events]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    await send(trimmed);
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-[200] w-[400px] max-h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#0d0a16]/95 backdrop-blur-xl shadow-2xl shadow-black/50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">DRO Agent</p>
                  <p className="text-[10px] text-white/40">9 agents · 18 tools</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEvents(!showEvents)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                    showEvents
                      ? "border-cyan-400/50 text-cyan-400 bg-cyan-400/10"
                      : "border-white/10 text-white/40 hover:text-white/60"
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={reset}
                  className="text-white/40 hover:text-white/60 text-[10px] px-2 py-1 rounded-full border border-white/10"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
              {messages.length === 0 && (
                <div className="text-center text-white/45 text-sm py-8">
                  <Bot size={32} className="mx-auto mb-3 text-white/50" />
                  <p>Ask me anything about products,</p>
                  <p>prices, orders, or tracking.</p>
                  <div className="mt-4 space-y-1">
                    {[
                      "Search for RTX 4070",
                      "Track order PB-20260407-0042",
                      "Compare CS2 skin prices",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                        }}
                        className="block mx-auto text-[11px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                      >
                        &quot;{suggestion}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[280px] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-cyan-500/20 text-white rounded-br-md"
                        : "bg-white/5 text-white/80 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <User size={12} className="text-white/60" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                    <Loader2 size={12} className="text-white animate-spin" />
                  </div>
                  <div className="bg-white/5 px-3 py-2 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-red-400/80 text-xs bg-red-400/10 px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Events Panel */}
            <AnimatePresence>
              {showEvents && events.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 overflow-hidden"
                >
                  <div className="px-3 py-2 max-h-[120px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/45 uppercase tracking-wider">Agent Events</span>
                      <ChevronDown size={10} className="text-white/50" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {events.slice(-10).map((event, i) => (
                        <EventBadge key={i} event={event} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask the DRO agent..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/45 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
