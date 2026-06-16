import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import AdminConversationDetail from "@/components/admin/AdminConversationDetail";

export const dynamic = "force-dynamic";

export default async function AdminConversationDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!conv) notFound();
  return (
    <AdminConversationDetail
      conversation={{
        id: conv.id,
        title: conv.title,
        model: conv.model,
        pinned: conv.pinned,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        userId: conv.userId,
        userEmail: conv.user.email,
        messageCount: conv.messages.length,
        messages: conv.messages.map((m) => ({
          id: m.id,
          role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
          content: m.content,
          tokensUsed: m.tokensUsed,
          creditsCharged: m.creditsCharged,
          createdAt: m.createdAt.toISOString()
        }))
      }}
    />
  );
}
