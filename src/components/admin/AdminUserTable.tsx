"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import type { AdminUserDTO } from "@/types";

type Props = {
  items: AdminUserDTO[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  role: string;
  banned: string;
};

export default function AdminUserTable({ items, total, page, pageSize, q, role, banned }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qLocal, setQLocal] = useState(q);
  const [busy, setBusy] = useState<string | null>(null);

  function applyFilters(next: Partial<{ q: string; role: string; banned: string; page: string }>) {
    const params = new URLSearchParams();
    if (next.q ?? qLocal) params.set("q", next.q ?? qLocal);
    if (next.role ?? role) params.set("role", next.role ?? role);
    if (next.banned ?? banned) params.set("banned", next.banned ?? banned);
    if (next.page) params.set("page", next.page);
    router.push(`/admin/users?${params.toString()}`);
  }

  async function adjustCredits(id: string, current: number) {
    const input = prompt(`Set credits for user (current: ${current}). Enter a non-negative integer:`);
    if (input == null) return;
    const n = parseInt(input, 10);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Invalid number");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: n - current, reason: "ADMIN_ADJUST" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(`Credits set to ${data.data.credits}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleRole(id: string, current: string) {
    const next = current === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`Change role to ${next}?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(`Role: ${next}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleBan(id: string, bannedNow: boolean) {
    if (!confirm(`${bannedNow ? "Unban" : "Ban"} this user?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !bannedNow })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(bannedNow ? "Unbanned" : "Banned");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, email: string) {
    if (!confirm(`PERMANENTLY delete ${email}? This will erase all their conversations, messages, and logs.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
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
          placeholder="Search email or name…"
          className="h-[40px] px-4 rounded-standard bg-surface-glass border border-border-light text-text-primary placeholder:text-text-disabled focus:border-electric-purple/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)] outline-none transition-all flex-1 min-w-[200px]"
        />
        <select
          value={role}
          onChange={(e) => applyFilters({ role: e.target.value, page: "1" })}
          className="h-[40px] px-3 rounded-standard bg-surface-glass border border-border-light text-text-primary outline-none"
        >
          <option value="">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={banned}
          onChange={(e) => applyFilters({ banned: e.target.value, page: "1" })}
          className="h-[40px] px-3 rounded-standard bg-surface-glass border border-border-light text-text-primary outline-none"
        >
          <option value="">All status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
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
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-right px-4 py-3 font-semibold">Credits</th>
                <th className="text-right px-4 py-3 font-semibold">Convs</th>
                <th className="text-right px-4 py-3 font-semibold">Msgs</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-tertiary">
                    No users match the current filters.
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border-light hover:bg-surface-glass-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-text-primary font-medium">{u.email}</div>
                    {u.name && <div className="text-text-tertiary text-[11px]">{u.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border", u.role === "ADMIN" ? "border-electric-purple/40 bg-electric-purple/15 text-electric-purple" : "border-border-light bg-surface-glass text-text-secondary")}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-primary">{u.credits.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{u.conversationCount}</td>
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{u.messageCount}</td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border border-danger-red/40 bg-danger-red/15 text-rose-pink">BANNED</span>
                    ) : u.emailVerified ? (
                      <span className="inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border border-emerald-success/30 bg-emerald-success/10 text-emerald-soft">VERIFIED</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-pill text-[11px] font-semibold border border-border-light bg-surface-glass text-text-secondary">PENDING</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        className="h-[28px] px-2.5 rounded-subtle border border-border-light text-text-secondary hover:border-border-strong hover:text-text-primary text-[11px] font-semibold transition-all"
                      >
                        View
                      </button>
                      <button
                        disabled={busy === u.id}
                        onClick={() => adjustCredits(u.id, u.credits)}
                        className="h-[28px] px-2.5 rounded-subtle border border-border-light text-text-secondary hover:border-border-strong hover:text-text-primary text-[11px] font-semibold transition-all disabled:opacity-50"
                      >
                        Credits
                      </button>
                      <button
                        disabled={busy === u.id}
                        onClick={() => toggleRole(u.id, u.role)}
                        className="h-[28px] px-2.5 rounded-subtle border border-border-light text-text-secondary hover:border-border-strong hover:text-text-primary text-[11px] font-semibold transition-all disabled:opacity-50"
                      >
                        {u.role === "ADMIN" ? "Demote" : "Promote"}
                      </button>
                      <button
                        disabled={busy === u.id}
                        onClick={() => toggleBan(u.id, u.banned)}
                        className={cn(
                          "h-[28px] px-2.5 rounded-subtle border text-[11px] font-semibold transition-all disabled:opacity-50",
                          u.banned ? "border-emerald-success/30 text-emerald-soft hover:border-emerald-success/60" : "border-warning-amber/30 text-warning-amber hover:border-warning-amber/60"
                        )}
                      >
                        {u.banned ? "Unban" : "Ban"}
                      </button>
                      <button
                        disabled={busy === u.id}
                        onClick={() => remove(u.id, u.email)}
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
        <div>
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || pending}
            onClick={() => start(() => applyFilters({ page: String(page - 1) }))}
            className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all"
          >
            ← Prev
          </button>
          <span className="text-text-tertiary tabular-nums">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages || pending}
            onClick={() => start(() => applyFilters({ page: String(page + 1) }))}
            className="h-[36px] px-3.5 rounded-standard border border-border-light bg-surface-glass text-text-primary text-body-small font-semibold hover:border-border-strong disabled:opacity-40 transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
