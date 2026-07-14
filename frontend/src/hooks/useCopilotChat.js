import { useState, useCallback, useRef } from "react";
import { API_BASE, fetchers } from "@/lib/api";

/**
 * Streaming chat hook for the AI Copilot (SSE over fetch).
 */
export const useCopilotChat = (sessionId = "global") => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const rows = await fetchers.chatHistory(sessionId);
      setMessages(rows.map((r) => ({ role: r.role, content: r.content })));
    } catch (e) {
      // history is non-critical
    }
    setHistoryLoaded(true);
  }, [sessionId]);

  const clear = useCallback(async () => {
    await fetchers.clearChat(sessionId);
    setMessages([]);
  }, [sessionId]);

  const send = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;
      setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", streaming: true }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`${API_BASE}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId }),
          signal: controller.signal,
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(part.slice(6));
              if (payload.delta) {
                setMessages((m) => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  copy[copy.length - 1] = { ...last, content: last.content + payload.delta };
                  return copy;
                });
              } else if (payload.error) {
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: "I hit an issue reaching the reasoning engine. Please try again.",
                    error: true,
                  };
                  return copy;
                });
              }
            } catch (e) {
              /* partial chunk */
            }
          }
        }
      } catch (e) {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.streaming && !last.content) {
            copy[copy.length - 1] = { role: "assistant", content: "Connection interrupted — please retry.", error: true };
          }
          return copy;
        });
      } finally {
        setMessages((m) => m.map((msg) => ({ ...msg, streaming: false })));
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming]
  );

  return { messages, send, isStreaming, loadHistory, historyLoaded, clear };
};
