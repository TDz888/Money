import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { signToken, setAuthCookie, verifyPassword, getClientIp } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `login:${clientKey({ ip })}`,
    Number(process.env.RATE_LIMIT_LOGIN_MAX || 5),
    Number(process.env.RATE_LIMIT_LOGIN_WINDOW_S || 900)
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "rate_limited", code: "TOO_MANY_REQUESTS" } satisfies ApiResponse<never>,
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" } satisfies ApiResponse<never>, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "invalid_input" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always run bcrypt to avoid timing oracle
  const dummyHash = "$2a$12$abcdefghijklmnopqrstuvwxyzABCDEF0123456789GHIJKLMNOPQRSTUV";
  const valid = await verifyPassword(password, user?.password ?? dummyHash);
  if (!user || !valid) {
    return NextResponse.json(
      { success: false, error: "invalid_credentials", code: "AUTH_FAILED" },
      { status: 401 }
    );
  }
  if (user.banned) {
    return NextResponse.json(
      { success: false, error: "account_banned", code: "BANNED" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // Update lastActiveAt (non-blocking best-effort)
  prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }).catch(() => null);

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  await setAuthCookie(token);

  return NextResponse.json(
    {
      success: true,
      data: { id: user.id, email: user.email, name: user.name, credits: user.credits, role: user.role }
    } satisfies ApiResponse<unknown>
  );
}

function rateLimitHeaders(rl: { remaining: number; resetAt: number; limit: number }) {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000))
  };
}
