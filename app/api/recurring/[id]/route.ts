export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const patchSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
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
    const { id } = await params;
    const body = await req.json();
    const data = patchSchema.parse(body);

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
