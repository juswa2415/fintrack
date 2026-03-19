export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const where: any = { userId: session.user.id };
    if (searchParams.get("month")) where.month = parseInt(searchParams.get("month")!);
    if (searchParams.get("year")) where.year = parseInt(searchParams.get("year")!);

    const budgets = await prisma.budget.findMany({
      where,
      include: { category: true },
    });

    return NextResponse.json(budgets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: session.user.id,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
        },
      },
      update: { amount: data.amount },
      create: {
        userId: session.user.id,
        categoryId: data.categoryId,
        amount: data.amount,
        month: data.month,
        year: data.year,
      },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
