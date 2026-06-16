"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  user: { email: string; name: string | null };
  children: React.ReactNode;
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/admin/users", label: "Users", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
  { href: "/admin/conversations", label: "Conversations", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { href: "/admin/yeumoney", label: "Yeumoney", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" },
  { href: "/admin/ledger", label: "Credit ledger", icon: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" }
];

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-surface-base text-text-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-[260px] flex-shrink-0 flex flex-col",
          "border-r border-border-light bg-surface-elevated",
          "transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-[70px] flex items-center px-5 border-b border-border-light">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-electric-purple text-2xl font-black">⌬</span>
            <div className="flex flex-col">
              <span className="text-h4 font-extrabold text-text-primary">Lux Cipher</span>
              <span className="text-[10px] uppercase tracking-wider text-electric-purple">Admin</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-standard text-body-small font-medium",
                  "transition-all",
                  active
                    ? "bg-electric-purple/15 text-electric-purple border border-electric-purple/30"
                    : "text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary"
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border-light space-y-2">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2 rounded-standard text-body-small text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
          >
            <span>←</span> Back to chat
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-standard text-body-small text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all text-left"
          >
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-[70px] flex items-center justify-between px-4 md:px-8 border-b border-border-light bg-surface-base/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden text-text-secondary hover:text-text-primary p-1"
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-electric-purple/10 border border-electric-purple/30">
              <span className="w-2 h-2 rounded-full bg-electric-purple animate-pulse" />
              <span className="text-h4 font-semibold text-electric-purple">ADMIN MODE</span>
            </div>
          </div>
          <div className="text-body-small text-text-secondary truncate">{user.name || user.email}</div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
