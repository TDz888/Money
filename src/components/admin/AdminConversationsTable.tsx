"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDate, truncate } from "@/lib/utils";
import type { ConversationDTO } from "@/types";

type Props = {
  items: ConversationDTO[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
};

export default function AdminConversationsTable({ items, total, page, pageSize, q }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qLocal, setQLocal] = useState(q);
  const [busy, setBusy] = useState<string | null>(null);

  function applyFilters(next: Partial<{ q: string; page: string }>) {
    const params = new URLSearchParams();
    if (next.q ?? qLocal) params.set("q", next.q ?? qLocal);
    if (next.page) params.set("page", next.page);
    router.push(`/admin/conversations?${params.toString()}`);
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete conversation "${truncate(title, 40)}"? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/conversations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success("Deleted");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: qLocal, page: "1" })}
          placeholder="Search title, model, or user email…"
          className="h-[40px] px-4 rounded-standard bg-surface-glass border border-border-light text-text-primary placeholder:text-text-disabled focus:border-electric-purple/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)] outline-none transition-all flex-1 min-w-[240px]"
        />
        <button
          onClick={() => applyFilters({ q: qLocal, page: "1" })}
          className="h-[40px] px-4 rounded-standard bg-electric-purple text-white font-semibold text-body-small hover:bg-electric-purple-hover transition-all"
        >
          Search
        </button>
      </div>

      <div className="rounded-generous border border-border-light bg-surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-small">
            <thead className="bg-surface-glass text-text-tertiary text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Model</th>
                <th className="text-right px-4 py-3 font-semibold">Messages</th>
                <th className="text-left px-4 py-3 font-semibold">Updated</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-tertiary">No conversations match.</td>
                </tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="border-t border-border-light hover:bg-surface-glass-hover transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium max-w-[300px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]">{c.userEmail}</td>
                  <td className="px-4 py-3 text-text-secondary">{truncate(c.model, 28)}</td>
                  <td className="px-4 py-3 text-right text-text-primary tabular-nums">{c.messageCount}</td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">{formatDate(c.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => router.push(`/admin/conversations/${c.id}`)}
                        className="h-[28px] px-2.5 rounded-subtle border border-border-light text-text-secondary hover:border-border-strong hover:text-text-primary text-[11px] font-semibold transition-all"
                      >
                        Open
                      </button>
                      <button
                        disabled={busy === c.id}
                        onClick={() => remove(c.id, c.title)}
                        className="h-[28px] px-2.5 rounded-subtle border border-danger-red/30 text-rose-pink hover:border-danger-red/60 text-[11px] font-semibold transition-all disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-body-small text-text-secondary">
        <div>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1 || pending} onClick={() => start(() => applyFilters({ page: String(page - 1) }))} className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all">← Prev</button>
          <span className="text-text-tertiary tabular-nums">{page} / {totalPages}</span>
          <button disabled={page >= totalPages || pending} onClick={() => start(() => applyFilters({ page: String(page + 1) }))} className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all">Next →</button>
        </div>
      </div>
    </div>
  );
}
