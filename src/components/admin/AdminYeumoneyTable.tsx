"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import type { YeumoneyLogDTO } from "@/types";

type Props = {
  items: YeumoneyLogDTO[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
  q: string;
};

export default function AdminYeumoneyTable({ items, total, page, pageSize, status, q }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qLocal, setQLocal] = useState(q);
  const [busy, setBusy] = useState<string | null>(null);

  function applyFilters(next: Partial<{ q: string; status: string; page: string }>) {
    const params = new URLSearchParams();
    if (next.q ?? qLocal) params.set("q", next.q ?? qLocal);
    if (next.status ?? status) params.set("status", next.status ?? status);
    if (next.page) params.set("page", next.page);
    router.push(`/admin/yeumoney?${params.toString()}`);
  }

  async function setStatus(id: string, target: "COMPLETED" | "FAILED") {
    if (!confirm(`Manually mark as ${target}?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/yeumoney/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(`Status: ${target}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this log?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/yeumoney/${id}`, { method: "DELETE" });
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
          placeholder="Search tx id or user email…"
          className="h-[40px] px-4 rounded-standard bg-surface-glass border border-border-light text-text-primary placeholder:text-text-disabled focus:border-electric-purple/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)] outline-none transition-all flex-1 min-w-[240px]"
        />
        <select
          value={status}
          onChange={(e) => applyFilters({ status: e.target.value, page: "1" })}
          className="h-[40px] px-3 rounded-standard bg-surface-glass border border-border-light text-text-primary outline-none"
        >
          <option value="">All status</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <button onClick={() => applyFilters({ q: qLocal, page: "1" })} className="h-[40px] px-4 rounded-standard bg-electric-purple text-white font-semibold text-body-small hover:bg-electric-purple-hover transition-all">Search</button>
      </div>

      <div className="rounded-generous border border-border-light bg-surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-small">
            <thead className="bg-surface-glass text-text-tertiary text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Tx ID</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-right px-4 py-3 font-semibold">Credits</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-left px-4 py-3 font-semibold">Completed</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-text-tertiary">No logs match.</td></tr>
              )}
              {items.map((l) => (
                <tr key={l.id} className="border-t border-border-light hover:bg-surface-glass-hover transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-text-tertiary max-w-[180px] truncate">{l.yeumoneyTxId}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{l.userEmail}</td>
                  <td className="px-4 py-3 text-right text-text-primary tabular-nums font-semibold">{l.credits.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border",
                      l.status === "COMPLETED" ? "border-emerald-success/40 bg-emerald-success/10 text-emerald-soft" :
                      l.status === "PENDING" ? "border-warning-amber/40 bg-warning-amber/10 text-warning-amber" :
                      "border-danger-red/40 bg-danger-red/10 text-rose-pink"
                    )}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">{l.completedAt ? formatDate(l.completedAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {l.status === "PENDING" && (
                        <>
                          <button disabled={busy === l.id} onClick={() => setStatus(l.id, "COMPLETED")} className="h-[28px] px-2.5 rounded-subtle border border-emerald-success/30 text-emerald-soft hover:bg-emerald-success/10 text-[11px] font-semibold transition-all disabled:opacity-50">Approve</button>
                          <button disabled={busy === l.id} onClick={() => setStatus(l.id, "FAILED")} className="h-[28px] px-2.5 rounded-subtle border border-danger-red/30 text-rose-pink hover:bg-danger-red/10 text-[11px] font-semibold transition-all disabled:opacity-50">Reject</button>
                        </>
                      )}
                      {l.shortUrl && (
                        <a href={l.shortUrl} target="_blank" rel="noreferrer" className="h-[28px] px-2.5 rounded-subtle border border-border-light text-text-secondary hover:border-border-strong hover:text-text-primary text-[11px] font-semibold transition-all flex items-center">Link ↗</a>
                      )}
                      <button disabled={busy === l.id} onClick={() => remove(l.id)} className="h-[28px] px-2.5 rounded-subtle border border-danger-red/30 text-rose-pink hover:border-danger-red/60 text-[11px] font-semibold transition-all disabled:opacity-50">Delete</button>
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
