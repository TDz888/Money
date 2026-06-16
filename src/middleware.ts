/**
 * Edge middleware: protects /chat, /admin, and the user-data API routes.
 * Auth is verified via the JWT in the auth-token cookie.
 * This file MUST stay edge-compatible (no bcrypt, no node:*).
 */

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/jwt";

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|robots.txt|favicon.svg|api/health|api/auth/(?:login|register)|api/yeumoney/webhook).*)"
  ]
};

const PROTECTED_PREFIXES = ["/chat", "/admin", "/api/chat", "/api/yeumoney/create", "/api/yeumoney/status", "/api/user", "/api/admin"];
const ADMIN_PREFIXES = ["/admin", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "invalid_token", code: "AUTH_INVALID" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // Admin gate
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isAdminRoute && payload.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "forbidden", code: "ADMIN_REQUIRED" },
        { status: 403 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
