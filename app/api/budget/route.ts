import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

const schema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { searchParams } = new URL(req.url);

    const where: any = { householdId: household.id };
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
    const household = await requireHousehold(session.user.id);
    const body = await req.json();
    const data = schema.parse(body);

    const budget = await prisma.budget.upsert({
      where: {
        householdId_categoryId_month_year: {
          householdId: household.id,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
        },
      },
      update: { amount: data.amount },
      create: {
        householdId: household.id,
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
