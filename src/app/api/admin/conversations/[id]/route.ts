import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, ConversationDTO, MessageDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const conv = await prisma.conversation.findUnique({
      where: { id: ctx.params.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 200 }
      }
    });
    if (!conv) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    const dto: ConversationDTO = {
      id: conv.id,
      title: conv.title,
      model: conv.model,
      pinned: conv.pinned,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      userId: conv.userId,
      userEmail: conv.user.email,
      messageCount: conv.messages.length,
      messages: conv.messages.map(
        (m): MessageDTO => ({
          id: m.id,
          role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
          content: m.content,
          tokensUsed: m.tokensUsed,
          creditsCharged: m.creditsCharged,
          createdAt: m.createdAt.toISOString()
        })
      )
    };
    return NextResponse.json({ success: true, data: dto } satisfies ApiResponse<ConversationDTO>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const conv = await prisma.conversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    await prisma.conversation.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ success: true, data: { ok: true } } satisfies ApiResponse<{ ok: true }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
