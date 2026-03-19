export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);

    const members = await prisma.householdMember.findMany({
      where: { householdId: household.id },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ household, members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

const inviteSchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);

    const member = await prisma.householdMember.findFirst({
      where: { householdId: household.id, userId: session.user.id, role: "OWNER" },
    });
    if (!member) return NextResponse.json({ error: "Only owners can invite" }, { status: 403 });

    const { email } = inviteSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const alreadyMember = await prisma.householdMember.findFirst({
        where: { householdId: household.id, userId: existing.id },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.invite.create({
      data: {
        householdId: household.id,
        senderId: session.user.id,
        email,
        expiresAt,
      },
    });

    return NextResponse.json({ inviteToken: invite.token, inviteLink: `/invite/${invite.token}` }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
