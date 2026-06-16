import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword, signToken, setAuthCookie, getClientIp } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `register:${clientKey({ ip })}`,
    Number(process.env.RATE_LIMIT_REGISTER_MAX || 3),
    Number(process.env.RATE_LIMIT_REGISTER_WINDOW_S || 3600)
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "invalid_input", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { success: false, error: "email_already_registered", code: "CONFLICT" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const isBootstrapAdmin =
    !!process.env.ADMIN_BOOTSTRAP_EMAIL &&
    process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase() === email;
  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name: name ?? null,
      credits: 0,
      role: isBootstrapAdmin ? "ADMIN" : "USER"
    }
  });

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  await setAuthCookie(token);

  return NextResponse.json(
    {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        role: user.role
      }
    } satisfies ApiResponse<unknown>,
    { status: 201 }
  );
}

function rateLimitHeaders(rl: { remaining: number; resetAt: number; limit: number }) {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000))
  };
}
