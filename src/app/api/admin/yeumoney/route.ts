import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, YeumoneyLogDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const q = (url.searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const where: any = {};
    if (status === "PENDING" || status === "COMPLETED" || status === "FAILED") {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { yeumoneyTxId: { contains: q } },
        { user: { email: { contains: q } } }
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.yeumoneyLog.count({ where }),
      prisma.yeumoneyLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: { user: { select: { email: true } } }
      })
    ]);

    const data: YeumoneyLogDTO[] = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.user.email,
      yeumoneyTxId: l.yeumoneyTxId,
      shortUrl: l.shortUrl,
      credits: l.credits,
      status: l.status as "PENDING" | "COMPLETED" | "FAILED",
      createdAt: l.createdAt.toISOString(),
      completedAt: l.completedAt ? l.completedAt.toISOString() : null
    }));

    return NextResponse.json({
      success: true,
      data: { items: data, total, page, pageSize: PAGE_SIZE }
    } satisfies ApiResponse<{ items: YeumoneyLogDTO[]; total: number; page: number; pageSize: number }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
