export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { memberId } = await params;

    // Only OWNER can remove members
    const requester = await prisma.householdMember.findFirst({
      where: { householdId: household.id, userId: session.user.id, role: "OWNER" },
    });
    if (!requester) {
      return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
    }

    const target = await prisma.householdMember.findFirst({
      where: { id: memberId, householdId: household.id },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove yourself (the owner)
    if (target.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself as owner" }, { status: 400 });
    }

    // Cannot remove another owner
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove another owner" }, { status: 400 });
    }

    await prisma.householdMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}