/**
 * Chat endpoint. Server-Sent Events stream.
 *
 * - Auth required (handled by middleware).
 * - Validates message with Zod.
 * - Pre-charges credits atomically BEFORE calling the AI provider; if
 *   the call fails the credits are refunded.
 * - Persists the user message + assistant response.
 * - Streams chunks back via SSE.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getClientIp, hashIp } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { streamChat, type ChatMessage } from "@/lib/ai-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREDITS_PER_MSG = Number(process.env.CREDITS_PER_MESSAGE || 2);
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return jsonError(401, "unauthorized", "AUTH_REQUIRED");
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  // 1. Rate limit
  const rl = await rateLimit(
    `chat:${clientKey({ userId: me.sub, ip })}`,
    Number(process.env.RATE_LIMIT_CHAT_MAX || 20),
    Number(process.env.RATE_LIMIT_CHAT_WINDOW_S || 60)
  );
  if (!rl.allowed) return jsonError(429, "rate_limited", "TOO_MANY_REQUESTS");

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json");
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message || "invalid_input", "VALIDATION");
  }
  const { content, conversationId, model } = parsed.data;
  const useModel = model || DEFAULT_MODEL;

  // 3. Load user, ensure credits
  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!user) return jsonError(401, "user_not_found", "AUTH_REQUIRED");
  if (user.credits < CREDITS_PER_MSG) {
    return jsonError(402, "insufficient_credits", "NO_CREDITS");
  }

  // 4. Get-or-create conversation (and ownership check)
  let conv = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, userId: me.sub }
      })
    : null;
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId: me.sub, model: useModel, title: content.slice(0, 60) }
    });
  } else {
    // If model changed on this turn, update it
    if (conv.model !== useModel) {
      await prisma.conversation.update({ where: { id: conv.id }, data: { model: useModel } });
    }
  }

  // 5. Build message history (cap to last 20 turns to keep context small)
  const history = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    take: 20
  });

  // 6. Atomically debit credits FIRST (prevents orphan user message on race)
  const debit = await prisma.user.updateMany({
    where: { id: me.sub, credits: { gte: CREDITS_PER_MSG } },
    data: { credits: { decrement: CREDITS_PER_MSG } }
  });
  if (debit.count === 0) {
    return jsonError(402, "insufficient_credits", "NO_CREDITS");
  }

  // 7. Persist user message
  const userMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: "USER",
      content
    }
  });

  await prisma.creditLedger.create({
    data: {
      userId: me.sub,
      amount: -CREDITS_PER_MSG,
      reason: "CHAT_DEBIT",
      refId: userMsg.id
    }
  });

  const messages: ChatMessage[] = [
    ...history.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content
    })),
    { role: "user", content }
  ];

  // 8. Open SSE stream
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* closed */
        }
      };
      send("meta", { conversationId: conv!.id, model: useModel, debited: CREDITS_PER_MSG });

      let acc = "";
      let totalUsage = { inputTokens: 0, outputTokens: 0 };
      let errored = false;
      try {
        for await (const chunk of streamChat({ model: useModel, messages, signal: req.signal })) {
          if (chunk.type === "delta" && chunk.text) {
            acc += chunk.text;
            send("delta", { text: chunk.text });
          } else if (chunk.type === "done" && chunk.usage) {
            totalUsage = chunk.usage;
          } else if (chunk.type === "error") {
            errored = true;
            send("error", { message: chunk.error || "ai_error" });
            break;
          }
        }
      } catch (err: any) {
        errored = true;
        send("error", { message: err?.message || "stream_error" });
      }

      // 9. Persist assistant message + update conversation
      if (!errored && acc) {
        await prisma.message.create({
          data: {
            conversationId: conv!.id,
            role: "ASSISTANT",
            content: acc,
            tokensUsed: totalUsage.inputTokens + totalUsage.outputTokens,
            creditsCharged: CREDITS_PER_MSG
          }
        });
        await prisma.conversation.update({
          where: { id: conv!.id },
          data: { updatedAt: new Date() }
        });
        send("done", { ok: true, conversationId: conv!.id });
      } else {
        // Refund the credit since we got no usable output
        await prisma.user.update({
          where: { id: me.sub },
          data: { credits: { increment: CREDITS_PER_MSG } }
        });
        await prisma.creditLedger.create({
          data: {
            userId: me.sub,
            amount: CREDITS_PER_MSG,
            reason: "CHAT_DEBIT",
            refId: userMsg.id
          }
        });
        await prisma.message.delete({ where: { id: userMsg.id } }).catch(() => null);
        send("done", { ok: false, refunded: true });
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

function jsonError(status: number, error: string, code?: string) {
  return new Response(JSON.stringify({ success: false, error, code }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
