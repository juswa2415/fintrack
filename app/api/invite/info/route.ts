export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        household: { select: { name: true } },
        sender: { select: { name: true } },
      },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 400 });
    }

    return NextResponse.json({
      householdName: invite.household.name,
      senderName: invite.sender.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
