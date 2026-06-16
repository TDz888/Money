"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/types";

type Props = {
  user: UserSummary;
};

export default function Header({ user }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 h-[70px] flex items-center px-6 md:px-10 border-b border-border-light"
      style={{
        background: "rgba(10, 10, 15, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "rgba(0, 0, 0, 0.5) 0px 1px 8px 0px"
      }}
    >
      <div className="flex items-center justify-between w-full max-w-[1440px] mx-auto">
        <Link href="/chat" className="flex items-center gap-2">
          <span className="text-electric-purple text-2xl font-black">⌬</span>
          <span className="text-h3 font-extrabold text-text-primary">Lux Cipher</span>
          <span className="hidden sm:inline ml-2 px-2 py-0.5 rounded-pill text-[11px] font-semibold bg-emerald-success/15 text-emerald-soft border border-emerald-success/30">
            BETA
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-pill bg-surface-glass border border-border-light">
            <span className="w-2 h-2 rounded-full bg-electric-purple animate-pulse" />
            <span className="text-h4 font-semibold text-text-primary tabular-nums">
              {user.credits.toLocaleString()} credits
            </span>
          </div>
          <div className="hidden md:block text-body-small text-text-secondary max-w-[200px] truncate">
            {user.name || user.email}
          </div>
          <button onClick={logout} className={cn(btnSecondary, "h-[42px]")}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

const btnSecondary = cn(
  "px-5 rounded-standard",
  "border border-border-light text-text-secondary",
  "hover:text-text-primary hover:border-border-strong hover:bg-surface-glass-hover",
  "active:bg-white/[0.08] active:text-text-primary active:border-border-strong",
  "transition-all text-h4 font-semibold"
);
