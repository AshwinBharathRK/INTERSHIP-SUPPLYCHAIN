import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCopilotChat } from "@/hooks/useCopilotChat";

const SUGGESTED = [
  "Which SKUs are at highest stockout risk right now?",
  "Which supplier should we diversify away from and why?",
  "Summarize network health for an executive briefing",
  "What is delaying our in-transit shipments?",
];

const renderContent = (text) => {
  // lightweight markdown: bold + bullet lines
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      ) : (
        p
      )
    );
    const isBullet = /^\s*[-*]\s/.test(line);
    return (
      <div key={i} className={isBullet ? "ml-3 flex gap-1.5" : ""}>
        {isBullet && <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--primary))]" />}
        <span>{isBullet ? parts.map((p) => (typeof p === "string" ? p.replace(/^\s*[-*]\s/, "") : p)) : parts}</span>
      </div>
    );
  });
};

export const ChatPanel = ({ sessionId = "global", compact = false }) => {
  const { messages, send, isStreaming, loadHistory, historyLoaded, clear } = useCopilotChat(sessionId);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!historyLoaded) loadHistory();
  }, [historyLoaded, loadHistory]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = (text) => {
    const value = text ?? input;
    if (!value.trim()) return;
    setInput("");
    send(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="copilot-chat-panel">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.12)] ring-1 ring-[hsl(var(--primary)/0.3)]">
              <Sparkles size={20} className="text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold">Atlas — Supply Chain Copilot</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Grounded in your live network data: inventory, suppliers, shipments, forecasts.
              </p>
            </div>
            <div className="grid w-full gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  data-testid="copilot-suggested-prompt"
                  className="rounded-lg border border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-2)/0.5)] px-3 py-2 text-left text-xs text-muted-foreground transition-[border-color,color,background-color] duration-200 hover:border-[hsl(var(--primary)/0.4)] hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[hsl(var(--primary)/0.16)] text-foreground ring-1 ring-[hsl(var(--primary)/0.25)]"
                    : "bg-[hsl(var(--surface-2))] text-foreground/90"
                }`}
                data-testid={m.role === "user" ? "copilot-user-message" : "copilot-assistant-message"}
              >
                {m.content ? (
                  <div className="space-y-1">{renderContent(m.content)}</div>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={13} className="animate-spin" /> Analyzing live network data…
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-[hsl(var(--stroke-soft)/0.5)] pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={compact ? 1 : 2}
            placeholder="Ask about inventory, suppliers, shipments, forecasts…"
            data-testid="copilot-chat-input"
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.6)] px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-[hsl(var(--primary)/0.5)] focus:outline-none"
          />
          <Button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            size="icon"
            data-testid="copilot-send-button"
            className="h-10 w-10 shrink-0 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.85)]"
          >
            {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            data-testid="copilot-clear-button"
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash2 size={11} /> Clear conversation
          </button>
        )}
      </div>
    </div>
  );
};
