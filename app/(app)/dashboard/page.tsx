import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "./charts";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const household = await requireHousehold(session!.user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [allTransactions, monthTransactions, recentTransactions, upcomingRecurring, budgets, expenseCategories] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { householdId: household.id },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { householdId: household.id, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { householdId: household.id },
        include: { category: true, user: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.recurringTransaction.findMany({
        where: { householdId: household.id, isActive: true },
        include: { category: true },
        orderBy: { startDate: "asc" },
        take: 5,
      }),
      prisma.budget.findMany({
        where: { householdId: household.id, month: now.getMonth() + 1, year: now.getFullYear() },
        include: { category: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { householdId: household.id, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

  const sixMonthsData = await getSixMonthsData(household.id);

  const totalIncome = await prisma.transaction.aggregate({
    where: { householdId: household.id, type: "INCOME" },
    _sum: { amount: true },
  });
  const totalExpense = await prisma.transaction.aggregate({
    where: { householdId: household.id, type: "EXPENSE" },
    _sum: { amount: true },
  });

  const monthIncome = monthTransactions.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const monthExpense = monthTransactions.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const netWorth = (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0);

  const categoryMap = await prisma.category.findMany({
    where: { householdId: household.id },
  });
  const catById = Object.fromEntries(categoryMap.map((c) => [c.id, c]));

  const pieData = expenseCategories.map((e) => ({
    name: catById[e.categoryId]?.name ?? "Unknown",
    value: e._sum.amount ?? 0,
    color: catById[e.categoryId]?.color ?? "#6366f1",
  }));

  const budgetData = budgets.map((b) => {
    const spent = expenseCategories.find((e) => e.categoryId === b.categoryId)?._sum.amount ?? 0;
    return { name: b.category.name, budget: b.amount, spent, color: b.category.color };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {now.toLocaleString("en-US", { month: "long", year: "numeric" })} overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth, household.currency)}
          icon={<Wallet className="h-5 w-5 text-indigo-600" />}
          bg="bg-indigo-50"
          change={netWorth >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="This Month Income"
          value={formatCurrency(monthIncome, household.currency)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          bg="bg-green-50"
          change="positive"
        />
        <StatCard
          title="This Month Expenses"
          value={formatCurrency(monthExpense, household.currency)}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          bg="bg-red-50"
          change="negative"
        />
        <StatCard
          title="Monthly Savings"
          value={formatCurrency(monthIncome - monthExpense, household.currency)}
          icon={<ArrowLeftRight className="h-5 w-5 text-purple-600" />}
          bg="bg-purple-50"
          change={(monthIncome - monthExpense) >= 0 ? "positive" : "negative"}
        />
      </div>

      <DashboardCharts
        sixMonthsData={sixMonthsData}
        pieData={pieData}
        budgetData={budgetData}
        currency={household.currency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentTransactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: t.category.color }}
                      >
                        {t.category.name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.description || t.category.name}</p>
                        <p className="text-xs text-gray-400">{t.user?.name ?? "Deleted User"} · {new Date(t.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount, household.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recurring Transactions</CardTitle>
            <Link href="/recurring" className="text-xs text-indigo-600 hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingRecurring.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No recurring transactions</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingRecurring.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: r.category.color }}
                      >
                        {r.category.name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.description || r.category.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{r.frequency.toLowerCase()}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${r.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {r.type === "INCOME" ? "+" : "-"}{formatCurrency(r.amount, household.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg, change }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  change: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className={`text-xl font-bold mt-0.5 ${change === "positive" ? "text-gray-900" : "text-gray-900"}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

async function getSixMonthsData(householdId: string) {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({
        where: { householdId, type: "INCOME", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { householdId, type: "EXPENSE", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    results.push({
      month: start.toLocaleString("en-US", { month: "short" }),
      income: inc._sum.amount ?? 0,
      expense: exp._sum.amount ?? 0,
    });
  }
  return results;
}
