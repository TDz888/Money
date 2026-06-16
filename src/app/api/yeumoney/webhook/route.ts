/**
 * POST /api/yeumoney/webhook
 *
 * Public endpoint (no auth) but HMAC-SHA256 signature required.
 * Idempotent: same yeumoneyTxId processed only once.
 *
 * Configure YEUMONEY_WEBHOOK_SECRET to match Yeumoney's dashboard.
 * The signature is read from the `X-Yeumoney-Signature` header
 * (or `x-signature` / `signature` for compat).
 */

import { NextRequest, NextResponse } from "next/server";
import { yeumoneyWebhookSchema } from "@/lib/validators";
import { applyVerifiedWebhook, verifyWebhookSignature } from "@/lib/yeumoney";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Read raw body for HMAC verification
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-yeumoney-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { success: false, error: "invalid_signature", code: "SIG_INVALID" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // 2. Parse
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json", code: "VALIDATION" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }
  const parsed = yeumoneyWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "invalid_payload", code: "VALIDATION" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // 3. Map -> internal fields
  const status =
    parsed.data.status === "completed" || parsed.data.status === "success"
      ? ("completed" as const)
      : ("failed" as const);
  const yeumoneyTxId =
    parsed.data.yeumoneyTxId ||
    (parsed.data as any).transaction_id ||
    (parsed.data as any).tx_id ||
    "";

  // 4. Apply idempotently
  const result = await applyVerifiedWebhook({
    yeumoneyTxId,
    status,
    credits: parsed.data.credits
  });
  return NextResponse.json({
    success: true,
    data: result
  } satisfies ApiResponse<unknown>);
}
