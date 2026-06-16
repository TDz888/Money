import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    delta: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.string().min(1).max(80).optional()
  })
  .strict();

/**
 * Adjust a user's credit balance by `delta` (positive = add, negative = deduct).
 * Records the change in the credit ledger. Cannot drive the balance below 0.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const me = await requireAdmin();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "invalid_json" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "invalid_input" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const { delta, reason } = parsed.data;
    const target = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    if (target.credits + delta < 0) {
      return NextResponse.json(
        { success: false, error: "insufficient_user_credits", code: "VALIDATION" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const updated = await prisma.user.update({
      where: { id: ctx.params.id, credits: delta < 0 ? { gte: -delta } : undefined },
      data: { credits: { increment: delta } }
    });
    await prisma.creditLedger.create({
      data: {
        userId: target.id,
        amount: delta,
        reason: reason || "ADMIN_ADJUST",
        refId: me.id
      }
    });
    return NextResponse.json({
      success: true,
      data: { userId: updated.id, credits: updated.credits, delta }
    } satisfies ApiResponse<unknown>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
