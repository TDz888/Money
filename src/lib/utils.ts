import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | number): string {
  const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function safeJson<T = unknown>(input: unknown, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(input)) as T;
  } catch {
    return fallback;
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Strip prompt-injection patterns. We keep this conservative:
 * anything that looks like "ignore previous instructions", system
 * prompt leakage, or `<|...|>` chat-template tokens is replaced.
 */
export function sanitizeUserInput(s: string): string {
  return s
    .replace(/<\|.*?\|>/g, "")
    .replace(/\bignore (all|any|the) (previous|prior|above) (instructions?|prompts?)\b/gi, "[filtered]")
    .replace(/\bdisregard .*system.*\b/gi, "[filtered]")
    .slice(0, 8000);
}
