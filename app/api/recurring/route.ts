export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recurring);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: session.user.id,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        description: data.description,
      },
      include: { category: true },
    });

    return NextResponse.json(recurring, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
