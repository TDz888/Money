"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import ModelSelector, { MODELS } from "./ModelSelector";
import TokenDisplay from "./TokenDisplay";
import { cn, formatDate, truncate } from "@/lib/utils";
import type { ConversationDTO, MessageDTO, UserSummary } from "@/types";

type Props = {
  user: UserSummary;
  initialConversations: ConversationDTO[];
};

const STORAGE_MODEL_KEY = "lc:model";

export default function ChatInterface({ user, initialConversations }: Props) {
  const [conversations, setConversations] = useState<ConversationDTO[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [credits, setCredits] = useState<number>(user.credits);
  const [model, setModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_MODEL_KEY) || "gpt-4o-mini";
    }
    return "gpt-4o-mini";
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/chat/history?id=${activeId}`, { cache: "no-store" });
      const data = await res.json();
      if (!cancelled && data?.success) {
        setMessages(data.data.messages || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Persist model choice
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MODEL_KEY, model);
    } catch {}
  }, [model]);

  // Refresh credits periodically (every 30s) so usage deductions reflect
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/user/credits", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setCredits(data.data.credits);
      } catch {}
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      if (credits <= 0) {
        toast.error("Out of credits. Complete a Yeumoney task to earn more.");
        return;
      }

      // Optimistic user message
      const tmpUserMsg: MessageDTO = {
        id: `tmp_${Date.now()}`,
        role: "USER",
        content,
        tokensUsed: 0,
        creditsCharged: 0,
        createdAt: new Date().toISOString()
      };
      setMessages((m) => [...m, tmpUserMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, model, conversationId: activeId }),
          signal: controller.signal
        });
        if (!res.ok || !res.body) {
          const txt = await res.text();
          let err = "Chat failed";
          try {
            const j = JSON.parse(txt);
            err = j?.error || err;
          } catch {}
          toast.error(err);
          setMessages((m) => m.filter((x) => x.id !== tmpUserMsg.id));
          return;
        }

        // Read SSE
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let buf = "";
        let convId: string | null = activeId;
        let newCredits = credits;
        const tmpAssistantId = `tmp_asst_${Date.now()}`;
        // Pre-insert an empty assistant message
        setMessages((m) => [
          ...m,
          { id: tmpAssistantId, role: "ASSISTANT", content: "", tokensUsed: 0, creditsCharged: 0, createdAt: new Date().toISOString() }
        ]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // Parse SSE
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const lines = block.split("\n");
            let event = "message";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) event = line.slice(7).trim();
              else if (line.startsWith("data: ")) data += line.slice(6);
            }
            if (!data) continue;
            try {
              const payload = JSON.parse(data);
              if (event === "meta") {
                convId = payload.conversationId;
                newCredits = Math.max(0, newCredits - (payload.debited || 0));
                setCredits(newCredits);
                if (convId && !activeId) setActiveId(convId);
              } else if (event === "delta" && payload.text) {
                acc += payload.text;
                setMessages((m) =>
                  m.map((msg) => (msg.id === tmpAssistantId ? { ...msg, content: acc } : msg))
                );
              } else if (event === "error") {
                toast.error(payload?.message || "Stream error");
              } else if (event === "done") {
                if (payload?.refunded) {
                  setMessages((m) => m.filter((x) => x.id !== tmpUserMsg.id && x.id !== tmpAssistantId));
                }
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Refresh conversation list
        const list = await fetch("/api/chat/history", { cache: "no-store" });
        const ld = await list.json();
        if (ld?.success) {
          setConversations(ld.data || []);
        }
        if (convId) setActiveId(convId);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          toast.message("Stopped");
        } else {
          toast.error(err?.message || "Network error");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeId, credits, isStreaming, model]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  async function newChat() {
    if (isStreaming) return;
    setActiveId(null);
    setMessages([]);
  }

  async function deleteConv(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/chat/history?id=${id}`, { method: "DELETE" });
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    toast.success("Deleted");
  }

  return (
    <div className="flex-1 flex relative min-h-0">
      {/* Sidebar */}
      <aside
        className={cn(
          "absolute md:static z-20 h-full w-[280px] flex-shrink-0 flex flex-col",
          "border-r border-border-light bg-surface-elevated",
          "transition-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 flex-shrink-0">
          <button onClick={newChat} className={cn(btnPrimary, "w-full")}>
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {conversations.length === 0 && (
            <div className="px-3 py-6 text-center text-text-tertiary text-body-small">No conversations yet.</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-standard cursor-pointer",
                "hover:bg-surface-glass-hover",
                activeId === c.id && "bg-surface-glass border border-border-light"
              )}
              onClick={() => {
                setActiveId(c.id);
                setSidebarOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-body-small text-text-primary truncate">{c.title || "New chat"}</div>
                <div className="text-[11px] text-text-tertiary">
                  {truncate(c.model, 22)} · {formatDate(c.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConv(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger-red text-body-small px-2"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-black/50 z-10 md:hidden"
        />
      )}

      {/* Main */}
      <section className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-[60px] flex items-center justify-between px-4 md:px-6 border-b border-border-light flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden text-text-secondary hover:text-text-primary p-1"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <ModelSelector value={model} onChange={setModel} disabled={isStreaming} />
          </div>
          <TokenDisplay credits={credits} />
        </div>

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onStop={stop}
          onSuggestion={(s) => sendMessage(s)}
        />

        <InputArea
          onSend={sendMessage}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={credits <= 0}
        />
      </section>
    </div>
  );
}

const btnPrimary = cn(
  "h-[42px] rounded-standard bg-electric-purple text-white font-semibold text-h4",
  "shadow-level-2 hover:bg-electric-purple-hover hover:shadow-level-3",
  "active:bg-electric-purple-active transition-all"
);
