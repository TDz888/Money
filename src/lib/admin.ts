/**
 * Server-side admin helpers. Throws on insufficient privileges.
 * Use inside API route handlers and server components.
 */

import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import type { ApiResponse } from "@/types";

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, code: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) throw new AuthError("unauthorized", "AUTH_REQUIRED", 401);
  if (me.role !== "ADMIN") throw new AuthError("forbidden", "ADMIN_REQUIRED", 403);
  // Re-verify role from DB to handle revocations without waiting for token expiry
  const user = await prisma.user.findUnique({ where: { id: me.sub }, select: { id: true, role: true } });
  if (!user) throw new AuthError("user_not_found", "NOT_FOUND", 404);
  if (user.role !== "ADMIN") throw new AuthError("forbidden", "ADMIN_REQUIRED", 403);
  return user;
}

export function adminErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code } satisfies ApiResponse<never>,
      { status: err.status }
    );
  }
  console.error("[admin] unexpected error", err);
  return NextResponse.json(
    { success: false, error: "internal_error", code: "INTERNAL" } satisfies ApiResponse<never>,
    { status: 500 }
  );
}
