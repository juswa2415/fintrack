export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, userId } = schema.parse(body);

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { household: true },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite is invalid or has expired" }, { status: 400 });
    }

    const alreadyMember = await prisma.householdMember.findFirst({
      where: { householdId: invite.householdId, userId },
    });

    if (!alreadyMember) {
      await prisma.$transaction([
        prisma.householdMember.create({
          data: { householdId: invite.householdId, userId, role: "MEMBER" },
        }),
        prisma.invite.update({
          where: { token },
          data: { status: "ACCEPTED" },
        }),
      ]);
    }

    return NextResponse.json({ success: true, householdId: invite.householdId });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}