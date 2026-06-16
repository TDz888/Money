import { cn } from "@/lib/utils";

type Accent = "purple" | "emerald" | "amber" | "rose" | "sky" | "muted";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: Accent;
};

const ACCENT: Record<Accent, { border: string; text: string; bg: string }> = {
  purple: { border: "border-electric-purple/30", text: "text-electric-purple", bg: "bg-electric-purple/[0.08]" },
  emerald: { border: "border-emerald-success/30", text: "text-emerald-soft", bg: "bg-emerald-success/[0.08]" },
  amber: { border: "border-warning-amber/30", text: "text-warning-amber", bg: "bg-warning-amber/[0.08]" },
  rose: { border: "border-danger-red/30", text: "text-rose-pink", bg: "bg-danger-red/[0.08]" },
  sky: { border: "border-sky-blue/30", text: "text-sky-blue", bg: "bg-sky-blue/[0.08]" },
  muted: { border: "border-border-light", text: "text-text-secondary", bg: "bg-surface-glass" }
};

export default function StatCard({ label, value, hint, accent = "purple" }: Props) {
  const a = ACCENT[accent];
  return (
    <div className={cn("relative rounded-generous border p-4 transition-all hover:shadow-level-1 overflow-hidden", a.border, a.bg)}>
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">{label}</div>
      <div className={cn("text-2xl font-extrabold tabular-nums mt-1.5 truncate", a.text)}>{value}</div>
      {hint && <div className="text-[11px] text-text-tertiary mt-1">{hint}</div>}
      <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/[0.02] blur-xl" />
    </div>
  );
}
