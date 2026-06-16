/**
 * Yeumoney integration.
 *
 * NOTE: Yeumoney's public API surface is intentionally abstracted so
 * the exact endpoint/payload can be tuned by editing this file only.
 * Default endpoints follow the convention:
 *   - create short link:   POST {YEUMONEY_API_URL}/links
 *   - webhook callback:    POST {APP_URL}/api/yeumoney/webhook
 *
 * The webhook MUST be signed with HMAC-SHA256 using YEUMONEY_WEBHOOK_SECRET.
 * The signature is expected in the `X-Yeumoney-Signature` header.
 */

import crypto from "crypto";
import { prisma } from "./prisma";

export type CreateLinkResult = {
  shortUrl: string;
  transactionId: string;
  raw: unknown;
};

function getConfig() {
  const apiKey = process.env.YEUMONEY_API_KEY;
  const apiUrl = process.env.YEUMONEY_API_URL || "https://yeumoney.com/api";
  const webhookSecret = process.env.YEUMONEY_WEBHOOK_SECRET;
  const reward = Number(process.env.YEUMONEY_REWARD_CREDITS || 100);
  if (!apiKey) throw new Error("YEUMONEY_API_KEY not configured");
  if (!webhookSecret) throw new Error("YEUMONEY_WEBHOOK_SECRET not configured");
  return { apiKey, apiUrl, webhookSecret, reward };
}

/**
 * Create a short link for the given user. The "transactionId" returned
 * is what the user will see in the webhook later. We generate it
 * locally so we can dedupe even if Yeumoney doesn't echo it back.
 */
export async function createYeumoneyLink(opts: {
  userId: string;
  returnUrl?: string;
}): Promise<CreateLinkResult> {
  const cfg = getConfig();
  const txId = `ym_${crypto.randomBytes(12).toString("hex")}`;

  // Persist a PENDING log first so we have an audit trail and can
  // detect double-completion later.
  await prisma.yeumoneyLog.create({
    data: {
      userId: opts.userId,
      yeumoneyTxId: txId,
      status: "PENDING",
      credits: cfg.reward
    }
  });

  // Real call to Yeumoney. If the upstream is unreachable we still
  // return the txId so the user can retry; do NOT silently credit.
  let shortUrl = "";
  try {
    const res = await fetch(`${cfg.apiUrl.replace(/\/$/, "")}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "X-Yeumoney-Client": "ai-chat-web/1.0"
      },
      body: JSON.stringify({
        user_id: opts.userId,
        transaction_id: txId,
        reward_credits: cfg.reward,
        return_url: opts.returnUrl || process.env.APP_URL || "http://localhost:3000"
      })
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    shortUrl =
      (raw.short_url as string) ||
      (raw.url as string) ||
      (raw.link as string) ||
      "";
    if (shortUrl) {
      await prisma.yeumoneyLog.update({
        where: { yeumoneyTxId: txId },
        data: { shortUrl }
      });
    }
  } catch (err) {
    // Network failure: log and continue. The user can retry.
    console.error("[yeumoney] create link failed", err);
  }

  return { shortUrl, transactionId: txId, raw: null };
}

/**
 * Verify a webhook signature. Returns true if the signature is valid
 * for the given body using HMAC-SHA256.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const cfg = getConfig();
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(rawBody)
    .digest("hex");
  // Constant-time compare to avoid timing attacks
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Apply a verified webhook. Idempotent: if the same yeumoneyTxId was
 * already COMPLETED, we do nothing.
 */
export async function applyVerifiedWebhook(payload: {
  yeumoneyTxId: string;
  status: "completed" | "success" | "failed" | "cancelled";
  credits?: number;
}): Promise<{ credited: boolean; reason: string; creditsAdded: number }> {
  const cfg = getConfig();
  const log = await prisma.yeumoneyLog.findUnique({
    where: { yeumoneyTxId: payload.yeumoneyTxId }
  });
  if (!log) return { credited: false, reason: "unknown_tx", creditsAdded: 0 };
  if (log.status === "COMPLETED") {
    return { credited: false, reason: "already_completed", creditsAdded: 0 };
  }
  if (payload.status === "completed" || payload.status === "success") {
    const credits = payload.credits ?? log.credits ?? cfg.reward;
    await prisma.$transaction(async (tx) => {
      await tx.yeumoneyLog.update({
        where: { yeumoneyTxId: payload.yeumoneyTxId },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
      await tx.user.update({
        where: { id: log.userId },
        data: { credits: { increment: credits } }
      });
      await tx.creditLedger.create({
        data: {
          userId: log.userId,
          amount: credits,
          reason: "YEUMONEY_REWARD",
          refId: log.id
        }
      });
    });
    return { credited: true, reason: "ok", creditsAdded: credits };
  } else {
    await prisma.yeumoneyLog.update({
      where: { yeumoneyTxId: payload.yeumoneyTxId },
      data: { status: "FAILED" }
    });
    return { credited: false, reason: "failed_status", creditsAdded: 0 };
  }
}

/**
 * Check rate-limit on Yeumoney task creation. Returns true if the user
 * is allowed to start a new task.
 */
export async function canStartYeumoneyTask(userId: string, hours = 1): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recent = await prisma.yeumoneyLog.findFirst({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" }
  });
  return !recent;
}

export function buildWebhookPayloadHash(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}
