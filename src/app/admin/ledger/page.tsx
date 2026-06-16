import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import AdminLedgerTable from "@/components/admin/AdminLedgerTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Props = { searchParams: { userId?: string; reason?: string; page?: string } };

export default async function AdminLedgerPage({ searchParams }: Props) {
  await requireAdmin();
  const userId = searchParams.userId || "";
  const reason = searchParams.reason || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));

  const where: any = {};
  if (userId) where.userId = userId;
  if (reason) where.reason = reason;

  const [total, entries, totalIssued, totalSpent] = await Promise.all([
    prisma.creditLedger.count({ where }),
    prisma.creditLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: { select: { email: true } } }
    }),
    prisma.creditLedger.aggregate({
      _sum: { amount: true },
      where: { ...where, amount: { gt: 0 } }
    }),
    prisma.creditLedger.aggregate({
      _sum: { amount: true },
      where: { ...where, amount: { lt: 0 } }
    })
  ]);

  const items = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userEmail: e.user.email,
    amount: e.amount,
    reason: e.reason,
    refId: e.refId,
    createdAt: e.createdAt.toISOString()
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-h1 font-extrabold text-text-primary">Credit ledger</h1>
        <p className="text-body-small text-text-secondary">
          {total.toLocaleString()} entries · issued {totalIssued._sum.amount ?? 0} · spent {Math.abs(totalSpent._sum.amount ?? 0)}
        </p>
      </div>
      <AdminLedgerTable items={items} total={total} page={page} pageSize={PAGE_SIZE} userId={userId} reason={reason} />
    </div>
  );
}
