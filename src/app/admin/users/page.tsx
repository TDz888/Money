import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import AdminUserTable from "@/components/admin/AdminUserTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  searchParams: { q?: string; role?: string; banned?: string; page?: string };
};

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const q = (searchParams.q || "").trim();
  const role = searchParams.role || "";
  const banned = searchParams.banned;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));

  const where: any = {};
  if (q) where.OR = [{ email: { contains: q } }, { name: { contains: q } }];
  if (role === "ADMIN" || role === "USER") where.role = role;
  if (banned === "true") where.banned = true;
  if (banned === "false") where.banned = false;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE
    })
  ]);

  const ids = users.map((u) => u.id);
  const counts = await Promise.all(
    ids.map((id) =>
      Promise.all([
        prisma.conversation.count({ where: { userId: id } }),
        prisma.message.count({ where: { conversation: { userId: id } } })
      ]).then(([c, m]) => [id, c, m] as const)
    )
  );
  const map = new Map(counts);

  const items = users.map((u) => ({
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
    conversationCount: map.get(u.id)?.[0] ?? 0,
    messageCount: map.get(u.id)?.[1] ?? 0
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-h1 font-extrabold text-text-primary">Users</h1>
        <p className="text-body-small text-text-secondary">{total.toLocaleString()} total · showing page {page}</p>
      </div>
      <AdminUserTable
        items={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        q={q}
        role={role}
        banned={banned || ""}
      />
    </div>
  );
}
