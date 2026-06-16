import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisMode } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness check - returns 200 as long as the Node process is alive.
 * Cheap to call, no external deps, so it never times out and never
 * causes "Network check failed" on Railway.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: { status: "ok", uptime: process.uptime(), time: new Date().toISOString() }
  });
}

/**
 * Deep readiness check (DB + cache). Same path accepts ?deep=1.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("deep") !== "1") {
    return NextResponse.json({ success: true, data: { status: "ok" } });
  }
  let dbOk = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err: any) {
    dbError = err?.message || "db_error";
  }
  return NextResponse.json(
    {
      success: dbOk,
      data: {
        status: dbOk ? "ok" : "degraded",
        db: dbOk,
        dbError,
        cache: redisMode,
        time: new Date().toISOString()
      }
    },
    { status: dbOk ? 200 : 503 }
  );
}
