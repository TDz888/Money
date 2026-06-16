import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import AdminConversationsTable from "@/components/admin/AdminConversationsTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = { searchParams: { q?: string; page?: string } };

export default async function AdminConversationsPage({ searchParams }: Props) {
  await requireAdmin();
  const q = (searchParams.q || "").trim();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { model: { contains: q } },
      { user: { email: { contains: q } } }
    ];
  }
  const [total, convs] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        _count: { select: { messages: true } }
      }
    })
  ]);

  const items = convs.map((c) => ({
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

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-h1 font-extrabold text-text-primary">Conversations</h1>
        <p className="text-body-small text-text-secondary">{total.toLocaleString()} total · page {page}</p>
      </div>
      <AdminConversationsTable items={items} total={total} page={page} pageSize={PAGE_SIZE} q={q} />
    </div>
  );
}
