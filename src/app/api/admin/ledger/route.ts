import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, CreditLedgerDTO } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "";
    const reason = url.searchParams.get("reason") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const where: any = {};
    if (userId) where.userId = userId;
    if (reason) where.reason = reason;

    const [total, entries] = await Promise.all([
      prisma.creditLedger.count({ where }),
      prisma.creditLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: { user: { select: { email: true } } }
      })
    ]);

    const data: CreditLedgerDTO[] = entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      userEmail: e.user.email,
      amount: e.amount,
      reason: e.reason,
      refId: e.refId,
      createdAt: e.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: { items: data, total, page, pageSize: PAGE_SIZE }
    } satisfies ApiResponse<{ items: CreditLedgerDTO[]; total: number; page: number; pageSize: number }>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
