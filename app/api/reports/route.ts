export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(new Date().getFullYear(), 0, 1);
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : new Date();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: from, lte: to },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    });

    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory: Record<string, { name: string; color: string; type: string; total: number }> = {};
    for (const t of transactions) {
      if (!byCategory[t.categoryId]) {
        byCategory[t.categoryId] = {
          name: t.category.name,
          color: t.category.color,
          type: t.type,
          total: 0,
        };
      }
      byCategory[t.categoryId].total += t.amount;
    }

    const monthly: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      const key = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
      if (t.type === "INCOME") monthly[key].income += t.amount;
      else monthly[key].expense += t.amount;
    }

    return NextResponse.json({
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      byCategory: Object.values(byCategory),
      monthly: Object.entries(monthly).map(([month, data]) => ({ month, ...data })),
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
