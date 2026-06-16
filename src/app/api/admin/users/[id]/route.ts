import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import type { ApiResponse, AdminUserDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    banned: z.boolean().optional(),
    bannedReason: z.string().max(280).optional().nullable(),
    credits: z.number().int().min(0).max(1_000_000).optional(),
    emailVerified: z.boolean().optional(),
    newPassword: z.string().min(8).max(128).optional()
  })
  .strict();

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const user = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    const [convCount, msgCount] = await Promise.all([
      prisma.conversation.count({ where: { userId: user.id } }),
      prisma.message.count({ where: { conversation: { userId: user.id } } })
    ]);
    const dto: AdminUserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      role: user.role,
      banned: user.banned,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
      conversationCount: convCount,
      messageCount: msgCount
    };
    return NextResponse.json({ success: true, data: dto } satisfies ApiResponse<AdminUserDTO>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "invalid_input", code: "VALIDATION" },
        { status: 400 }
      );
    }
    const target = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    // Refuse to demote or ban the last admin
    if ((parsed.data.role === "USER" || parsed.data.banned === true) && target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", banned: false } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "cannot_demote_last_admin", code: "PROTECTED" },
          { status: 400 }
        );
      }
    }
    // Refuse admin to demote self to avoid lockout
    if (target.id === me.id && parsed.data.role === "USER") {
      return NextResponse.json(
        { success: false, error: "cannot_demote_self", code: "PROTECTED" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.banned !== undefined) data.banned = parsed.data.banned;
    if (parsed.data.bannedReason !== undefined) data.bannedReason = parsed.data.bannedReason;
    if (parsed.data.emailVerified !== undefined) data.emailVerified = parsed.data.emailVerified;
    if (parsed.data.credits !== undefined) data.credits = parsed.data.credits;
    if (parsed.data.newPassword) data.password = await hashPassword(parsed.data.newPassword);

    const updated = await prisma.user.update({ where: { id: ctx.params.id }, data });

    // Log the change
    if (parsed.data.credits !== undefined && parsed.data.credits !== target.credits) {
      const delta = parsed.data.credits - target.credits;
      await prisma.creditLedger.create({
        data: {
          userId: target.id,
          amount: delta,
          reason: "ADMIN_ADJUST",
          refId: me.id
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        credits: updated.credits,
        role: updated.role,
        banned: updated.banned,
        emailVerified: updated.emailVerified,
        updatedAt: updated.updatedAt.toISOString()
      }
    } satisfies ApiResponse<unknown>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const me = await requireAdmin();
    if (ctx.params.id === me.id) {
      return NextResponse.json(
        { success: false, error: "cannot_delete_self", code: "PROTECTED" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    const target = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "cannot_delete_last_admin", code: "PROTECTED" },
          { status: 400 }
        );
      }
    }
    // Cascade-delete conversations, messages, logs, ledger via Prisma relations
    await prisma.user.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ success: true, data: { ok: true } } satisfies ApiResponse<{ ok: true }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
