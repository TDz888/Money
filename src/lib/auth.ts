/**
 * Auth helpers. Node-only (uses bcryptjs).
 * For edge-compatible JWT functions, import from `@/lib/jwt` instead.
 */

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { AUTH_COOKIE, signToken, verifyToken, type JWTPayload } from "./jwt";

export { AUTH_COOKIE, signToken, verifyToken, type JWTPayload };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(token: string) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const maxAgeSec = parseDurationToSeconds(expiresIn);
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSec
  });
}

export function clearAuthCookie() {
  cookies().set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUserFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function parseDurationToSeconds(d: string): number {
  const m = /^(\d+)([smhd])$/.exec(d);
  if (!m) return 7 * 24 * 60 * 60;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case "s": return n;
    case "m": return n * 60;
    case "h": return n * 60 * 60;
    case "d": return n * 60 * 60 * 24;
    default: return 7 * 24 * 60 * 60;
  }
}

export function getClientIp(req: Request | NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}

export function hashIp(ip: string): string {
  // Lightweight non-cryptographic hash for grouping; for real-world
  // privacy use a server-side secret + HMAC.
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0;
  return `ip_${(h >>> 0).toString(16)}`;
}
