import { prisma } from "@/lib/prisma";
import { redisMode } from "@/lib/redis";
import StatCard from "@/components/admin/StatCard";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
import { requireAdmin } from "@/lib/admin";
import type { AdminStats } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    admins,
    banned,
    verified,
    new24,
    new7d,
    totalConvs,
    newConvs24,
    totalMsgs,
    newMsgs24,
    yeumoneyTotal,
    yeumoneyCompleted,
    yeumoneyPending,
    yeumoneyFailed,
    creditSums,
    outstanding
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
    prisma.creditLedger.groupBy({ by: ["reason"], _sum: { amount: true } }),
    prisma.user.aggregate({ _sum: { credits: true } })
  ]);

  const issued = creditSums.find((s) => s.reason === "YEUMONEY_REWARD")?._sum.amount ?? 0;
  const spentRaw = creditSums.find((s) => s.reason === "CHAT_DEBIT")?._sum.amount ?? 0;
  const completionRate = yeumoneyTotal === 0 ? 0 : (yeumoneyCompleted / yeumoneyTotal) * 100;

  const stats: AdminStats = {
    users: {
      total: totalUsers,
      admins,
      banned,
      verified,
      newLast7d: new7d,
      newLast24h: new24
    },
    conversations: { total: totalConvs, newLast24h: newConvs24 },
    messages: { total: totalMsgs, newLast24h: newMsgs24 },
    credits: {
      totalIssued: issued > 0 ? issued : 0,
      totalSpent: spentRaw < 0 ? -spentRaw : 0,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 font-extrabold text-text-primary">Dashboard</h1>
          <p className="text-body-small text-text-secondary">System overview · {new Date().toLocaleString()}</p>
        </div>
        <AdminQuickActions />
      </div>

      <section>
        <h2 className="text-h3 font-semibold text-text-secondary mb-3">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.users.total} hint={`+${stats.users.newLast24h} today`} accent="purple" />
          <StatCard label="Admins" value={stats.users.admins} accent="sky" />
          <StatCard label="Banned" value={stats.users.banned} accent={stats.users.banned > 0 ? "rose" : "muted"} />
          <StatCard label="Verified" value={stats.users.verified} accent="emerald" />
          <StatCard label="Last 24h" value={stats.users.newLast24h} accent="purple" />
          <StatCard label="Last 7d" value={stats.users.newLast7d} accent="purple" />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold text-text-secondary mb-3">Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Conversations" value={stats.conversations.total} hint={`+${stats.conversations.newLast24h} today`} accent="sky" />
          <StatCard label="Messages" value={stats.messages.total} hint={`+${stats.messages.newLast24h} today`} accent="sky" />
          <StatCard label="Credits in circulation" value={stats.credits.outstanding.toLocaleString()} accent="amber" />
          <StatCard
            label="Yeumoney rate"
            value={`${stats.yeumoney.completionRate.toFixed(1)}%`}
            hint={`${stats.yeumoney.completed}/${stats.yeumoney.total}`}
            accent="emerald"
          />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold text-text-secondary mb-3">Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Total issued" value={stats.credits.totalIssued.toLocaleString()} accent="emerald" />
          <StatCard label="Total spent" value={stats.credits.totalSpent.toLocaleString()} accent="rose" />
          <StatCard label="Outstanding" value={stats.credits.outstanding.toLocaleString()} accent="purple" />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold text-text-secondary mb-3">Yeumoney</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total tasks" value={stats.yeumoney.total} accent="purple" />
          <StatCard label="Completed" value={stats.yeumoney.completed} accent="emerald" />
          <StatCard label="Pending" value={stats.yeumoney.pending} accent="amber" />
          <StatCard label="Failed" value={stats.yeumoney.failed} accent="rose" />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold text-text-secondary mb-3">System</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Cache mode" value={stats.system.cacheMode.toUpperCase()} accent={stats.system.cacheMode === "redis" ? "emerald" : "muted"} />
          <StatCard label="Uptime" value={`${Math.floor(stats.system.uptime)}s`} accent="sky" />
          <StatCard label="Node" value={stats.system.nodeVersion} accent="muted" />
        </div>
      </section>
    </div>
  );
}
