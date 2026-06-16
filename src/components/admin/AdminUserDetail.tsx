"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import type { AdminUserDTO, CreditLedgerDTO } from "@/types";

type Props = {
  user: AdminUserDTO & { bannedReason: string | null };
  ledger: CreditLedgerDTO[];
};

export default function AdminUserDetail({ user, ledger }: Props) {
  const router = useRouter();
  const [credits, setCredits] = useState<string>(String(user.credits));
  const [busy, setBusy] = useState(false);

  async function patch(body: any) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success("Updated");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function adjust(delta: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason: "ADMIN_ADJUST" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Failed");
        return;
      }
      toast.success(`New balance: ${data.data.credits}`);
      setCredits(String(data.data.credits));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function setExact() {
    const n = parseInt(credits, 10);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Invalid credits");
      return;
    }
    await patch({ credits: n });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button
          onClick={() => router.push("/admin/users")}
          className="text-body-small text-text-secondary hover:text-text-primary mb-2"
        >
          ← Back to users
        </button>
        <h1 className="text-h1 font-extrabold text-text-primary">{user.email}</h1>
        <p className="text-body-small text-text-secondary">{user.name || "—"} · created {formatDate(user.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-generous border border-border-light bg-surface-elevated p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Role</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("px-2.5 py-1 rounded-pill text-[11px] font-semibold border", user.role === "ADMIN" ? "border-electric-purple/40 bg-electric-purple/15 text-electric-purple" : "border-border-light bg-surface-glass text-text-secondary")}>
              {user.role}
            </span>
            {user.banned && (
              <span className="px-2.5 py-1 rounded-pill text-[11px] font-semibold border border-danger-red/40 bg-danger-red/15 text-rose-pink">BANNED</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => patch({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })} className="px-3 h-[34px] rounded-standard border border-border-light text-body-small font-semibold hover:border-border-strong hover:bg-surface-glass-hover transition-all disabled:opacity-50">
              {user.role === "ADMIN" ? "Demote" : "Promote"}
            </button>
            <button disabled={busy} onClick={() => patch({ banned: !user.banned })} className={cn("px-3 h-[34px] rounded-standard border text-body-small font-semibold transition-all disabled:opacity-50", user.banned ? "border-emerald-success/30 text-emerald-soft hover:bg-emerald-success/10" : "border-warning-amber/30 text-warning-amber hover:bg-warning-amber/10")}>
              {user.banned ? "Unban" : "Ban"}
            </button>
            <button disabled={busy} onClick={() => patch({ emailVerified: !user.emailVerified })} className="px-3 h-[34px] rounded-standard border border-border-light text-body-small font-semibold hover:border-border-strong hover:bg-surface-glass-hover transition-all disabled:opacity-50">
              {user.emailVerified ? "Unverify" : "Verify"}
            </button>
          </div>
        </div>

        <div className="rounded-generous border border-border-light bg-surface-elevated p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Credits</div>
          <div className="text-3xl font-extrabold text-electric-purple tabular-nums mt-2">{user.credits.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2">
            <input
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              type="number"
              min={0}
              className="flex-1 h-[36px] px-3 rounded-standard bg-surface-glass border border-border-light text-text-primary text-body-small outline-none focus:border-electric-purple/60"
            />
            <button disabled={busy} onClick={setExact} className="h-[36px] px-3 rounded-standard bg-electric-purple text-white text-body-small font-semibold hover:bg-electric-purple-hover transition-all disabled:opacity-50">Set</button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button disabled={busy} onClick={() => adjust(100)} className="flex-1 h-[32px] rounded-subtle border border-emerald-success/30 text-emerald-soft text-[11px] font-semibold hover:bg-emerald-success/10 transition-all disabled:opacity-50">+100</button>
            <button disabled={busy} onClick={() => adjust(500)} className="flex-1 h-[32px] rounded-subtle border border-emerald-success/30 text-emerald-soft text-[11px] font-semibold hover:bg-emerald-success/10 transition-all disabled:opacity-50">+500</button>
            <button disabled={busy} onClick={() => adjust(-100)} className="flex-1 h-[32px] rounded-subtle border border-danger-red/30 text-rose-pink text-[11px] font-semibold hover:bg-danger-red/10 transition-all disabled:opacity-50">−100</button>
            <button disabled={busy} onClick={() => adjust(-user.credits)} className="flex-1 h-[32px] rounded-subtle border border-danger-red/30 text-rose-pink text-[11px] font-semibold hover:bg-danger-red/10 transition-all disabled:opacity-50">Zero out</button>
          </div>
        </div>

        <div className="rounded-generous border border-border-light bg-surface-elevated p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Activity</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="text-text-tertiary text-[11px]">Conversations</div>
              <div className="text-h2 font-extrabold text-text-primary tabular-nums">{user.conversationCount}</div>
            </div>
            <div>
              <div className="text-text-tertiary text-[11px]">Messages</div>
              <div className="text-h2 font-extrabold text-text-primary tabular-nums">{user.messageCount}</div>
            </div>
            <div className="col-span-2">
              <div className="text-text-tertiary text-[11px]">Last seen</div>
              <div className="text-body-small text-text-primary">{user.lastActiveAt ? formatDate(user.lastActiveAt) : "Never"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-generous border border-border-light bg-surface-elevated p-5">
        <h2 className="text-h3 font-bold text-text-primary mb-4">Credit ledger</h2>
        {ledger.length === 0 ? (
          <div className="text-text-tertiary text-body-small py-8 text-center">No entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-small">
              <thead className="text-text-tertiary text-[11px] uppercase tracking-wider">
                <tr className="border-b border-border-light">
                  <th className="text-left py-2 px-2 font-semibold">Time</th>
                  <th className="text-left py-2 px-2 font-semibold">Reason</th>
                  <th className="text-right py-2 px-2 font-semibold">Amount</th>
                  <th className="text-left py-2 px-2 font-semibold">Ref</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.id} className="border-b border-border-light/50">
                    <td className="py-2 px-2 text-text-tertiary text-[11px]">{formatDate(e.createdAt)}</td>
                    <td className="py-2 px-2 text-text-primary">{e.reason}</td>
                    <td className={cn("py-2 px-2 text-right tabular-nums font-semibold", e.amount >= 0 ? "text-emerald-soft" : "text-rose-pink")}>
                      {e.amount >= 0 ? "+" : ""}{e.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-text-tertiary text-[11px] font-mono">{e.refId ? e.refId.slice(0, 12) + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
