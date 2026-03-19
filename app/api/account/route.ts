export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  password: z.string().min(1, "Password is required to confirm deletion"),
});

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify password before deletion
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Check if user is the sole OWNER of any household
    const ownedHouseholds = await prisma.householdMember.findMany({
      where: { userId: user.id, role: "OWNER" },
      include: {
        household: {
          include: { members: true },
        },
      },
    });

    for (const membership of ownedHouseholds) {
      const otherMembers = membership.household.members.filter(
        (m) => m.userId !== user.id
      );
      if (otherMembers.length > 0) {
        // There are other members — must transfer ownership first
        return NextResponse.json({
          error: `You are the owner of "${membership.household.name}" which has other members. Transfer ownership or remove all members before deleting your account.`,
        }, { status: 400 });
      }
    }

    // Safe to delete — transactions/recurring stay (userId set to null via SetNull)
    // Households where user is sole member will cascade delete
    await prisma.user.delete({ where: { id: user.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
