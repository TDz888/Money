import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "ADMIN") redirect("/chat");
  const fresh = await prisma.user.findUnique({ where: { id: me.sub }, select: { role: true, email: true, name: true } });
  if (!fresh || fresh.role !== "ADMIN") redirect("/chat");
  return (
    <AdminShell user={{ email: fresh.email, name: fresh.name }}>
      {children}
    </AdminShell>
  );
}
