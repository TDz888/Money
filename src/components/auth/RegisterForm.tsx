"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data?.error || "Registration failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Account created!");
      router.push("/chat");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Network error");
      toast.error(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-h4 font-semibold text-text-secondary mb-2">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ada Lovelace"
          maxLength={60}
        />
      </div>
      <div>
        <label className="block text-h4 font-semibold text-text-secondary mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-h4 font-semibold text-text-secondary mb-2">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className={inputCls}
          placeholder="At least 8 chars · Aa1"
          minLength={8}
        />
      </div>
      {error && (
        <div className="rounded-standard border border-danger-red/30 bg-danger-red/10 px-4 py-2.5 text-body-small text-rose-pink">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}

const inputCls = cn(
  "w-full h-[49px] px-5 rounded-standard",
  "bg-surface-glass border border-border-light",
  "text-text-primary placeholder:text-text-disabled",
  "focus:border-electric-purple/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)]",
  "transition-all outline-none"
);
const btnPrimary = cn(
  "w-full h-[54px] rounded-standard",
  "bg-electric-purple text-white font-semibold text-base",
  "shadow-level-2 hover:bg-electric-purple-hover hover:shadow-level-3",
  "active:bg-electric-purple-active active:shadow-[0_2px_8px_rgba(124,58,237,0.2)]",
  "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
);
