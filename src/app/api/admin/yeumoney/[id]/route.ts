import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import { applyVerifiedWebhook } from "@/lib/yeumoney";
import type { ApiResponse, YeumoneyLogDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
    credits: z.number().int().min(0).max(1_000_000).optional()
  })
  .strict();

/**
 * Manually approve / reject a Yeumoney task. Idempotent (uses the same
 * applyVerifiedWebhook pipeline that the real webhook uses).
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "invalid_json" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "invalid_input" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const log = await prisma.yeumoneyLog.findUnique({ where: { id: ctx.params.id } });
    if (!log) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    const result = await applyVerifiedWebhook({
      yeumoneyTxId: log.yeumoneyTxId,
      status: parsed.data.status === "COMPLETED" ? "completed" : "failed",
      credits: parsed.data.credits
    });
    const updated = await prisma.yeumoneyLog.findUnique({
      where: { id: log.id },
      include: { user: { select: { email: true } } }
    });
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    const dto: YeumoneyLogDTO = {
      id: updated.id,
      userId: updated.userId,
      userEmail: updated.user.email,
      yeumoneyTxId: updated.yeumoneyTxId,
      shortUrl: updated.shortUrl,
      credits: updated.credits,
      status: updated.status as "PENDING" | "COMPLETED" | "FAILED",
      createdAt: updated.createdAt.toISOString(),
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null
    };
    return NextResponse.json({ success: true, data: { log: dto, apply: result } } satisfies ApiResponse<unknown>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const log = await prisma.yeumoneyLog.findUnique({ where: { id: ctx.params.id } });
    if (!log) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    await prisma.yeumoneyLog.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ success: true, data: { ok: true } } satisfies ApiResponse<{ ok: true }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
