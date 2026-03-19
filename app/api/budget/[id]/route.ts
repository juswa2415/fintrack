import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;

    const budget = await prisma.budget.findFirst({
      where: { id, householdId: household.id },
    });
    if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
