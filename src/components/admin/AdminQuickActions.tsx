"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminQuickActions() {
  const router = useRouter();

  async function ping() {
    const t0 = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      const dt = Math.round(performance.now() - t0);
      if (data?.success) toast.success(`Health: ${data.data.status} (${dt}ms)`);
      else toast.error("Health check failed");
    } catch (e: any) {
      toast.error(e?.message || "Network error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={ping}
        className="px-3.5 h-[36px] rounded-standard border border-border-light bg-surface-glass text-body-small text-text-primary font-semibold hover:border-border-strong hover:bg-surface-glass-hover transition-all"
      >
        Ping API
      </button>
      <button
        onClick={() => router.refresh()}
        className="px-3.5 h-[36px] rounded-standard border border-border-light bg-surface-glass text-body-small text-text-primary font-semibold hover:border-border-strong hover:bg-surface-glass-hover transition-all"
      >
        Refresh
      </button>
    </div>
  );
}
