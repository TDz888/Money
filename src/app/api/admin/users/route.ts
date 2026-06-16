import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, AdminUserDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const role = url.searchParams.get("role") || "";
    const bannedParam = url.searchParams.get("banned");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const where: any = {};
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } }
      ];
    }
    if (role === "ADMIN" || role === "USER") where.role = role;
    if (bannedParam === "true") where.banned = true;
    if (bannedParam === "false") where.banned = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: {
          _count: { select: { conversations: true, messages: false as any } }
        }
      })
    ]);

    // messageCount isn't a relation; do a batched aggregate for the visible page
    const ids = users.map((u) => u.id);
    const msgCounts = await prisma.message.groupBy({
      by: ["conversationId"],
      _count: { _all: true },
      where: { conversation: { userId: { in: ids } } }
    });
    // Build per-user total: count of all messages across all their conversations
    const userMessageTotals = new Map<string, number>();
    for (const u of users) {
      const count = await prisma.message.count({
        where: { conversation: { userId: u.id } }
      });
      userMessageTotals.set(u.id, count);
    }
    void msgCounts;

    const data: AdminUserDTO[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      credits: u.credits,
      role: u.role,
      banned: u.banned,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
      conversationCount: (u as any)._count?.conversations ?? 0,
      messageCount: userMessageTotals.get(u.id) ?? 0
    }));

    return NextResponse.json({
      success: true,
      data: { items: data, total, page, pageSize: PAGE_SIZE }
    } satisfies ApiResponse<{ items: AdminUserDTO[]; total: number; page: number; pageSize: number }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
