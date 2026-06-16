"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Props = {
  credits: number;
  reward: number;
};

type Status = {
  eligible: boolean;
  shortUrl: string | null;
  pendingTxId: string | null;
  lastStatus: "PENDING" | "COMPLETED" | "FAILED" | null;
  reward: number;
  credits: number;
};

export default function YeumoneyGate({ credits, reward }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  async function loadStatus() {
    setChecking(true);
    try {
      const res = await fetch("/api/yeumoney/status", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) setStatus(data.data);
    } catch {
      /* ignore */
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  // Poll when we have a pending transaction so we can detect completion
  useEffect(() => {
    if (!status?.pendingTxId) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/yeumoney/status", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) {
        setStatus(data.data);
        if (data.data.lastStatus === "COMPLETED" && data.data.credits > 0) {
          toast.success(`+${reward} credits added!`);
          router.refresh();
        }
      }
    }, 5000);
    return () => clearInterval(t);
  }, [status?.pendingTxId, reward, router]);

  async function startTask() {
    setLoading(true);
    try {
      const res = await fetch("/api/yeumoney/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Could not start task");
        return;
      }
      const shortUrl = data.data.shortUrl;
      if (shortUrl) {
        window.open(shortUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.message("Task created. The link will appear shortly.");
      }
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="rounded-generous border border-border-light bg-surface-elevated p-10 shadow-level-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-pill bg-electric-purple/15 border border-electric-purple/30 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-electric-purple"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-h1 font-extrabold text-text-primary mb-2">Unlock chat</h1>
          <p className="text-body-compact text-text-secondary max-w-md mx-auto mb-8">
            Complete a short Yeumoney task to earn <b className="text-text-primary">{reward}</b> credits and start
            chatting. Available again in 1 hour.
          </p>

          {checking ? (
            <div className="text-text-secondary text-body-small">Checking…</div>
          ) : status?.pendingTxId && status.lastStatus === "PENDING" ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-warning-amber/30 bg-warning-amber/10 text-warning-amber text-h4 font-semibold">
                <span className="w-2 h-2 rounded-full bg-warning-amber animate-pulse" />
                Awaiting completion…
              </div>
              {status.shortUrl && (
                <div className="text-body-small text-text-secondary">
                  Re-open:{" "}
                  <a className="text-electric-purple underline" href={status.shortUrl} target="_blank" rel="noreferrer">
                    {status.shortUrl}
                  </a>
                </div>
              )}
              <p className="text-body-small text-text-tertiary">This page will refresh automatically when you complete the task.</p>
            </div>
          ) : (
            <button
              onClick={startTask}
              disabled={loading || !status?.eligible}
              className={cn(
                "px-7 py-3.5 rounded-standard bg-electric-purple text-white font-semibold text-base",
                "shadow-level-2 hover:bg-electric-purple-hover hover:shadow-level-3",
                "active:bg-electric-purple-active",
                "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              )}
            >
              {loading ? "Generating link…" : status?.eligible === false ? "Cooldown — try later" : "Start Yeumoney task"}
            </button>
          )}

          <div className="mt-10 grid grid-cols-3 gap-3 text-left">
            {[
              { k: "Open", v: "Click the button" },
              { k: "Complete", v: "Follow the short link" },
              { k: "Chat", v: "Credits added automatically" }
            ].map((s, i) => (
              <div key={s.k} className="rounded-standard bg-surface-glass border border-border-light p-4">
                <div className="text-h4 font-bold text-electric-purple">0{i + 1}</div>
                <div className="text-h4 font-semibold text-text-primary">{s.k}</div>
                <div className="text-body-small text-text-secondary">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
