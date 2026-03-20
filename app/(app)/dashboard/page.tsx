import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "./charts";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  Target, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function getDueStatus(frequency: string, lastLogged: Date | null, startDate: Date) {
  const now = new Date();
  if (lastLogged) {
    const days = Math.floor((now.getTime() - lastLogged.getTime()) / 86400000);
    if (lastLogged.toDateString() === now.toDateString()) return "logged-today";
    const period = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, YEARLY: 365 }[frequency] ?? 30;
    if (days >= period) return "overdue";
    if (days >= period - 3) return "due-soon";
    return "upcoming";
  }
  const daysUntil = Math.floor((startDate.getTime() - now.getTime()) / 86400000);
  if (startDate <= now) return "overdue";
  if (daysUntil <= 3) return "due-soon";
  return "upcoming";
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true, name: true, hasSeenOnboarding: true },
  });
  const currency = user?.currency ?? "USD";
  const showOnboarding = !user?.hasSeenOnboarding;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    monthTxGroups, lastMonthTxGroups,
    recentTransactions, allRecurring,
    budgets, expenseCategories,
    goals, totalIncome, totalExpense,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { category: true },
    }),
    prisma.budget.findMany({
      where: { userId: session.user.id, month: now.getMonth() + 1, year: now.getFullYear() },
      include: { category: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: session.user.id, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const sixMonthsData = await getSixMonthsData(session.user.id);

  const monthIncome = monthTxGroups.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const monthExpense = monthTxGroups.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const lastMonthExpense = lastMonthTxGroups.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const monthlySavings = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((monthlySavings / monthIncome) * 100) : 0;
  const netWorth = (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0);
  const expenseDiff = monthExpense - lastMonthExpense;

  const categoryMap = await prisma.category.findMany({ where: { userId: session.user.id } });
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

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const dueRecurring = allRecurring.filter((r) => {
    const s = getDueStatus(r.frequency, r.lastLogged, r.startDate);
    return s === "overdue" || s === "due-soon";
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {now.toLocaleString("en-US", { month: "long", year: "numeric" })} overview
          </p>
        </div>
        {expenseDiff !== 0 && lastMonthExpense > 0 && (
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${expenseDiff > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {expenseDiff > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(expenseDiff), currency)} vs last month
          </div>
        )}
      </div>

      {dueRecurring.length > 0 && (
        <Link href="/recurring">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors cursor-pointer">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {dueRecurring.length} recurring transaction{dueRecurring.length > 1 ? "s" : ""} need logging
              </p>
              <p className="text-xs text-amber-600">{dueRecurring.map((r) => r.description || r.category.name).join(", ")}</p>
            </div>
            <span className="text-xs text-amber-600 font-medium">View →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Net Worth" value={formatCurrency(netWorth, currency)}
          icon={<Wallet className="h-5 w-5 text-indigo-600" />} bg="bg-indigo-50" />
        <StatCard title="Month Income" value={formatCurrency(monthIncome, currency)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />} bg="bg-green-50" />
        <StatCard title="Month Expenses" value={formatCurrency(monthExpense, currency)}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />} bg="bg-red-50" />
        <StatCard title="Monthly Savings" value={formatCurrency(monthlySavings, currency)}
          icon={<PiggyBank className="h-5 w-5 text-purple-600" />} bg="bg-purple-50" />
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="relative w-11 h-11 flex-shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#e0e7ff" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none"
                  stroke={savingsRate >= 20 ? "#22c55e" : savingsRate >= 10 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="4"
                  strokeDasharray={`${Math.max(0, Math.min(100, savingsRate)) * 1.131} 113.1`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                {savingsRate}%
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Savings Rate</p>
              <p className={`text-base font-bold mt-0.5 ${savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-amber-500" : "text-red-500"}`}>
                {savingsRate >= 20 ? "Great 🎉" : savingsRate >= 10 ? "Fair" : savingsRate > 0 ? "Low" : "None"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts
        sixMonthsData={sixMonthsData}
        pieData={pieData}
        budgetData={budgetData}
        currency={currency}
        showOnboarding={showOnboarding}
      />

      {pieData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Expenses This Month</CardTitle>
            <Link href="/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pieData.map((d, i) => {
              const pct = Math.round((d.value / monthExpense) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-gray-700">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(d.value, currency)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Savings Goals
              </CardTitle>
              <Link href="/goals" className="text-xs text-indigo-600 hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGoals.map((g) => {
                const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{g.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(g.currentAmount, currency)} / {formatCurrency(g.targetAmount, currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% complete</p>
                  </div>
                );
              })}
              {completedGoals.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-400 line-through">{g.name}</span>
                  <span className="text-xs text-green-600 font-medium ml-auto">Completed!</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: t.category.color }}>
                        {t.category.name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.description || t.category.name}</p>
                        <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${t.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount, currency)}
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

function StatCard({ title, value, icon, bg }: {
  title: string; value: string; icon: React.ReactNode; bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-base font-bold mt-0.5 text-gray-900 truncate" title={value}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function getSixMonthsData(userId: string) {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
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
