import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisMode } from "@/lib/redis";
import { requireAdmin, adminErrorResponse } from "@/lib/admin";
import type { ApiResponse, AdminStats } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalAdmins,
      totalBanned,
      totalVerified,
      newUsers24h,
      newUsers7d,
      totalConversations,
      newConversations24h,
      totalMessages,
      newMessages24h,
      yeumoneyTotal,
      yeumoneyCompleted,
      yeumoneyPending,
      yeumoneyFailed,
      creditSums
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.message.count(),
      prisma.message.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.yeumoneyLog.count(),
      prisma.yeumoneyLog.count({ where: { status: "COMPLETED" } }),
      prisma.yeumoneyLog.count({ where: { status: "PENDING" } }),
      prisma.yeumoneyLog.count({ where: { status: "FAILED" } }),
      prisma.creditLedger.groupBy({
        by: ["reason"],
        _sum: { amount: true }
      })
    ]);

    const issued =
      creditSums.find((s) => s.reason === "YEUMONEY_REWARD")?._sum.amount ?? 0;
    const spent =
      creditSums.find((s) => s.reason === "CHAT_DEBIT")?._sum.amount ?? 0;
    const outstanding = await prisma.user.aggregate({ _sum: { credits: true } });

    const completionRate = yeumoneyTotal === 0 ? 0 : (yeumoneyCompleted / yeumoneyTotal) * 100;

    const stats: AdminStats = {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        banned: totalBanned,
        verified: totalVerified,
        newLast7d: newUsers7d,
        newLast24h: newUsers24h
      },
      conversations: { total: totalConversations, newLast24h: newConversations24h },
      messages: { total: totalMessages, newLast24h: newMessages24h },
      credits: {
        totalIssued: issued > 0 ? issued : 0,
        totalSpent: spent < 0 ? -spent : 0,
        outstanding: outstanding._sum.credits ?? 0
      },
      yeumoney: {
        total: yeumoneyTotal,
        completed: yeumoneyCompleted,
        pending: yeumoneyPending,
        failed: yeumoneyFailed,
        completionRate
      },
      system: {
        cacheMode: redisMode,
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    };

    return NextResponse.json({ success: true, data: stats } satisfies ApiResponse<AdminStats>);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
