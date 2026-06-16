import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ApiResponse, ConversationDTO, MessageDTO } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { success: false, error: "unauthorized", code: "AUTH_REQUIRED" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const conv = await prisma.conversation.findFirst({
      where: { id, userId: me.sub },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });
    if (!conv) {
      return NextResponse.json(
        { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: toDTO(conv) satisfies ConversationDTO
    } satisfies ApiResponse<ConversationDTO>);
  }
  const list = await prisma.conversation.findMany({
    where: { userId: me.sub },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  return NextResponse.json({
    success: true,
    data: list.map((c) => toDTO({ ...c, messages: [] })) satisfies ConversationDTO[]
  } satisfies ApiResponse<ConversationDTO[]>);
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { success: false, error: "unauthorized", code: "AUTH_REQUIRED" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, error: "missing_id", code: "VALIDATION" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }
  const conv = await prisma.conversation.findFirst({ where: { id, userId: me.sub } });
  if (!conv) {
    return NextResponse.json(
      { success: false, error: "not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ success: true, data: { ok: true } } satisfies ApiResponse<{ ok: true }>);
}

function toDTO(conv: any): ConversationDTO {
  return {
    id: conv.id,
    title: conv.title,
    model: conv.model,
    pinned: conv.pinned,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: conv.messages
      ? conv.messages.map(
          (m: any): MessageDTO => ({
            id: m.id,
            role: m.role,
            content: m.content,
            tokensUsed: m.tokensUsed,
            creditsCharged: m.creditsCharged,
            createdAt: m.createdAt.toISOString()
          })
        )
      : undefined
  };
}
