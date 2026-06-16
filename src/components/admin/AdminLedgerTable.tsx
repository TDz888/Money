"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn, formatDate } from "@/lib/utils";
import type { CreditLedgerDTO } from "@/types";

type Props = {
  items: CreditLedgerDTO[];
  total: number;
  page: number;
  pageSize: number;
  userId: string;
  reason: string;
};

const REASONS = ["YEUMONEY_REWARD", "CHAT_DEBIT", "ADMIN_ADJUST"];

export default function AdminLedgerTable({ items, total, page, pageSize, userId, reason }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [userIdLocal, setUserIdLocal] = useState(userId);
  const [busy] = useState(false);

  function applyFilters(next: Partial<{ userId: string; reason: string; page: string }>) {
    const params = new URLSearchParams();
    if (next.userId ?? userIdLocal) params.set("userId", next.userId ?? userIdLocal);
    if (next.reason ?? reason) params.set("reason", next.reason ?? reason);
    if (next.page) params.set("page", next.page);
    router.push(`/admin/ledger?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={userIdLocal}
          onChange={(e) => setUserIdLocal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters({ userId: userIdLocal, page: "1" })}
          placeholder="User ID (cuid)…"
          className="h-[40px] px-4 rounded-standard bg-surface-glass border border-border-light text-text-primary placeholder:text-text-disabled focus:border-electric-purple/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)] outline-none transition-all flex-1 min-w-[240px] font-mono"
        />
        <select
          value={reason}
          onChange={(e) => applyFilters({ reason: e.target.value, page: "1" })}
          className="h-[40px] px-3 rounded-standard bg-surface-glass border border-border-light text-text-primary outline-none"
        >
          <option value="">All reasons</option>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => applyFilters({ userId: userIdLocal, page: "1" })} className="h-[40px] px-4 rounded-standard bg-electric-purple text-white font-semibold text-body-small hover:bg-electric-purple-hover transition-all">Search</button>
      </div>

      <div className="rounded-generous border border-border-light bg-surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-small">
            <thead className="bg-surface-glass text-text-tertiary text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Ref</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-text-tertiary">No entries match.</td></tr>
              )}
              {items.map((e) => (
                <tr key={e.id} className="border-t border-border-light hover:bg-surface-glass-hover transition-colors">
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{e.userEmail}</td>
                  <td className="px-4 py-3 text-text-primary">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border",
                      e.reason === "YEUMONEY_REWARD" ? "border-emerald-success/40 bg-emerald-success/10 text-emerald-soft" :
                      e.reason === "CHAT_DEBIT" ? "border-electric-purple/40 bg-electric-purple/10 text-electric-purple" :
                      "border-warning-amber/40 bg-warning-amber/10 text-warning-amber"
                    )}>
                      {e.reason}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", e.amount >= 0 ? "text-emerald-soft" : "text-rose-pink")}>
                    {e.amount >= 0 ? "+" : ""}{e.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px] font-mono">{e.refId ? e.refId.slice(0, 12) + "…" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-body-small text-text-secondary">
        <div>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1 || pending || busy} onClick={() => start(() => applyFilters({ page: String(page - 1) }))} className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all">← Prev</button>
          <span className="text-text-tertiary tabular-nums">{page} / {totalPages}</span>
          <button disabled={page >= totalPages || pending || busy} onClick={() => start(() => applyFilters({ page: String(page + 1) }))} className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all">Next →</button>
        </div>
      </div>
    </div>
  );
}
