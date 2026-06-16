import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import AdminUserDetail from "@/components/admin/AdminUserDetail";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();
  const [convCount, msgCount, ledger] = await Promise.all([
    prisma.conversation.count({ where: { userId: user.id } }),
    prisma.message.count({ where: { conversation: { userId: user.id } } }),
    prisma.creditLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);
  return (
    <AdminUserDetail
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        role: user.role,
        banned: user.banned,
        bannedReason: user.bannedReason,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
        conversationCount: convCount,
        messageCount: msgCount
      }}
      ledger={ledger.map((l) => ({
        id: l.id,
        userId: l.userId,
        userEmail: user.email,
        amount: l.amount,
        reason: l.reason,
        refId: l.refId,
        createdAt: l.createdAt.toISOString()
      }))}
    />
  );
}
