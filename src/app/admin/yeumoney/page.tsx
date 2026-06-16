import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import AdminYeumoneyTable from "@/components/admin/AdminYeumoneyTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = { searchParams: { status?: string; q?: string; page?: string } };

export default async function AdminYeumoneyPage({ searchParams }: Props) {
  await requireAdmin();
  const status = searchParams.status || "";
  const q = (searchParams.q || "").trim();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));

  const where: any = {};
  if (status === "PENDING" || status === "COMPLETED" || status === "FAILED") where.status = status;
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

  const items = logs.map((l) => ({
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

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-h1 font-extrabold text-text-primary">Yeumoney</h1>
        <p className="text-body-small text-text-secondary">{total.toLocaleString()} logs · page {page}</p>
      </div>
      <AdminYeumoneyTable items={items} total={total} page={page} pageSize={PAGE_SIZE} status={status} q={q} />
    </div>
  );
}
