import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

export async function GET() {
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
      { success: false, error: "user_not_found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        role: user.role
      }
    } satisfies ApiResponse<unknown>
  );
}
