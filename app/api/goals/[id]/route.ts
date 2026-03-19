export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const contributeSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.contribute) {
      const { amount, categoryId } = contributeSchema.parse(body);
      const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            categoryId,
            amount,
            type: "EXPENSE",
            date: new Date(),
            description: `Contribution to goal: ${goal.name}`,
          },
        });
        return tx.goal.update({
          where: { id },
          data: {
            currentAmount: newAmount,
            isCompleted: newAmount >= goal.targetAmount,
          },
        });
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        targetAmount: body.targetAmount,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
