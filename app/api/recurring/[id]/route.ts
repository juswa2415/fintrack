import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, householdId: household.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          householdId: household.id,
          userId: session.user.id,
          categoryId: recurring.categoryId,
          amount: recurring.amount,
          type: recurring.type,
          date: new Date(),
          description: recurring.description ?? undefined,
        },
        include: { category: true },
      });
      await tx.recurringTransaction.update({
        where: { id },
        data: { lastLogged: new Date() },
      });
      return created;
    });

    return NextResponse.json(transaction, { status: 201 });
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

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, householdId: household.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: body,
      include: { category: true, user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, householdId: household.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.recurringTransaction.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
