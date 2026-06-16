"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { ConversationDTO } from "@/types";

type Props = { conversation: ConversationDTO };

export default function AdminConversationDetail({ conversation: c }: Props) {
  const router = useRouter();

  async function remove() {
    if (!confirm("Delete this conversation?")) return;
    const res = await fetch(`/api/admin/conversations/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast.error(data?.error || "Failed");
      return;
    }
    toast.success("Deleted");
    router.push("/admin/conversations");
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <button onClick={() => router.push("/admin/conversations")} className="text-body-small text-text-secondary hover:text-text-primary mb-2">← Back to conversations</button>
        <h1 className="text-h1 font-extrabold text-text-primary">{c.title}</h1>
        <p className="text-body-small text-text-secondary">
          {c.userEmail} · {c.model} · {c.messageCount} messages · updated {formatDate(c.updatedAt)}
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={remove} className="px-4 h-[38px] rounded-standard border border-danger-red/30 text-rose-pink font-semibold text-body-small hover:bg-danger-red/10 transition-all">
          Delete conversation
        </button>
      </div>

      <div className="rounded-generous border border-border-light bg-surface-elevated p-5 space-y-4">
        {(c.messages || []).map((m) => (
          <div
            key={m.id}
            className={
              m.role === "USER"
                ? "rounded-standard border border-electric-purple/20 bg-electric-purple/5 p-4"
                : m.role === "ASSISTANT"
                ? "rounded-standard border border-border-light bg-surface-glass p-4"
                : "rounded-standard border border-warning-amber/20 bg-warning-amber/5 p-4"
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={
                  m.role === "USER"
                    ? "text-[11px] font-semibold text-electric-purple uppercase tracking-wider"
                    : m.role === "ASSISTANT"
                    ? "text-[11px] font-semibold text-sky-blue uppercase tracking-wider"
                    : "text-[11px] font-semibold text-warning-amber uppercase tracking-wider"
                }
              >
                {m.role}
              </span>
              <span className="text-[11px] text-text-tertiary">{formatDate(m.createdAt)}</span>
            </div>
            <pre className="text-body-small text-text-primary whitespace-pre-wrap break-words font-sans">{m.content}</pre>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-text-tertiary">
              {m.tokensUsed > 0 && <span>{m.tokensUsed.toLocaleString()} tokens</span>}
              {m.creditsCharged > 0 && <span>−{m.creditsCharged} credits</span>}
            </div>
          </div>
        ))}
        {(c.messages || []).length === 0 && <div className="text-center py-12 text-text-tertiary">No messages in this conversation.</div>}
      </div>
    </div>
  );
}
