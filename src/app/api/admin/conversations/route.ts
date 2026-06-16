import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, ConversationDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const userId = url.searchParams.get("userId") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { model: { contains: q } },
        { user: { email: { contains: q } } }
      ];
    }
    if (userId) where.userId = userId;

    const [total, convs] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { messages: true } }
        }
      })
    ]);

    const data: ConversationDTO[] = convs.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      pinned: c.pinned,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      userId: c.userId,
      userEmail: c.user.email,
      messageCount: (c as any)._count?.messages ?? 0
    }));

    return NextResponse.json({
      success: true,
      data: { items: data, total, page, pageSize: PAGE_SIZE }
    } satisfies ApiResponse<{ items: ConversationDTO[]; total: number; page: number; pageSize: number }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
