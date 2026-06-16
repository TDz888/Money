import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ApiResponse, YeumoneyStatus } from "@/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { success: false, error: "unauthorized", code: "AUTH_REQUIRED" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.yeumoneyLog.findFirst({
    where: { userId: me.sub, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" }
  });
  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  const status: YeumoneyStatus = {
    eligible: !recent,
    shortUrl: recent?.shortUrl ?? null,
    pendingTxId: recent && recent.status === "PENDING" ? recent.yeumoneyTxId : null,
    lastStatus: (recent?.status as "PENDING" | "COMPLETED" | "FAILED" | null) ?? null,
    reward: Number(process.env.YEUMONEY_REWARD_CREDITS || 100)
  };
  return NextResponse.json({ success: true, data: { ...status, credits: user?.credits ?? 0 } } satisfies ApiResponse<unknown>);
}
