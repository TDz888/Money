import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { success: false, error: "unauthorized", code: "AUTH_REQUIRED" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "user_not_found", code: "NOT_FOUND" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: { credits: user.credits } } satisfies ApiResponse<{ credits: number }>);
}
