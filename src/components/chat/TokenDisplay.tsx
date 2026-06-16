"use client";

import { cn } from "@/lib/utils";

type Props = { credits: number };

export default function TokenDisplay({ credits }: Props) {
  const low = credits <= 5;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-pill border",
        low ? "border-danger-red/30 bg-danger-red/10" : "border-border-light bg-surface-glass"
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          low ? "bg-danger-red animate-pulse" : "bg-electric-purple animate-pulse"
        )}
      />
      <span className={cn("text-h4 font-semibold tabular-nums", low ? "text-rose-pink" : "text-text-primary")}>
        {credits.toLocaleString()} credits
      </span>
    </div>
  );
}
