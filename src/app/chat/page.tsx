import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChatInterface from "@/components/chat/ChatInterface";
import YeumoneyGate from "@/components/yeumoney/YeumoneyGate";
import Header from "@/components/layout/Header";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/chat");

  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!user) redirect("/login");

  const convs = await prisma.conversation.findMany({
    where: { userId: me.sub },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  const hasCredits = user.credits > 0;

  return (
    <main className="relative min-h-screen flex flex-col">
      <Header user={{ id: user.id, email: user.email, name: user.name, credits: user.credits }} />
      {hasCredits ? (
        <ChatInterface
          user={{ id: user.id, email: user.email, name: user.name, credits: user.credits, role: user.role }}
          initialConversations={convs.map((c) => ({
            id: c.id,
            title: c.title,
            model: c.model,
            pinned: c.pinned,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString()
          }))}
        />
      ) : (
        <YeumoneyGate credits={user.credits} reward={Number(process.env.YEUMONEY_REWARD_CREDITS || 100)} />
      )}
    </main>
  );
}
