import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: { id, householdId: household.id },
    });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (category.isDefault) {
      return NextResponse.json({ error: "Cannot delete default categories" }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;
    const body = await req.json();

    const category = await prisma.category.findFirst({
      where: { id, householdId: household.id },
    });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.category.update({
      where: { id },
      data: { name: body.name, icon: body.icon, color: body.color },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
