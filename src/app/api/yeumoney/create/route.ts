/**
 * POST /api/yeumoney/create
 * Creates a short link for the current user. Rate-limited to 1/hour/user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getClientIp, hashIp } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { yeumoneyCreateSchema } from "@/lib/validators";
import { createYeumoneyLink, canStartYeumoneyTask } from "@/lib/yeumoney";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { success: false, error: "unauthorized", code: "AUTH_REQUIRED" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  // Per-user rate limit
  const rl = await rateLimit(
    `yeumoney_create:${clientKey({ userId: me.sub, ip })}`,
    Number(process.env.RATE_LIMIT_YEUMONEY_MAX || 1),
    Number(process.env.RATE_LIMIT_YEUMONEY_WINDOW_S || 3600)
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "yeumoney_cooldown", code: "TOO_MANY_REQUESTS" } satisfies ApiResponse<never>,
      { status: 429 }
    );
  }

  // Cooldown (per-user 1/hour)
  const allowed = await canStartYeumoneyTask(me.sub, 1);
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "yeumoney_cooldown",
        code: "COOLDOWN",
        data: null
      } satisfies ApiResponse<null>,
      { status: 429 }
    );
  }

  // Optional body
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* no body */
  }
  const parsed = yeumoneyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "invalid_input", code: "VALIDATION" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const result = await createYeumoneyLink({ userId: me.sub, returnUrl: parsed.data.returnUrl });
    return NextResponse.json({
      success: true,
      data: {
        shortUrl: result.shortUrl,
        transactionId: result.transactionId,
        reward: Number(process.env.YEUMONEY_REWARD_CREDITS || 100)
      }
    } satisfies ApiResponse<unknown>);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "yeumoney_create_failed", code: "UPSTREAM" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
