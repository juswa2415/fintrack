export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenOnboarding: true },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
