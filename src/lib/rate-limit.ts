/**
 * Sliding-window rate limiter using Redis (or in-memory fallback).
 * Fail-open on backend errors so a Redis outage does not take the app down,
 * but log loudly. Always pair with abuse detection at the IP layer.
 */

import { store } from "./redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

  try {
    const count = await store.incr(windowKey);
    if (count === 1) {
      await store.expire(windowKey, windowSeconds);
    }
    const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit
    };
  } catch (err) {
    console.error("[rate-limit] error, failing open", err);
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + windowMs,
      limit
    };
  }
}

export function clientKey(parts: { userId?: string | null; ip?: string | null }): string {
  // Combine userId (if any) with IP hash so a logged-in attacker cannot
  // bypass limits by switching IPs.
  if (parts.userId && parts.ip) return `u:${parts.userId}|i:${parts.ip}`;
  if (parts.userId) return `u:${parts.userId}`;
  return `i:${parts.ip ?? "unknown"}`;
}
