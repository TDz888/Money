import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ success: true, data: { ok: true } } satisfies ApiResponse<{ ok: true }>);
}
