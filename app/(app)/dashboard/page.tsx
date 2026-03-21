import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "./charts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
    recentTransactions, upcomingRecurring,
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
      take: 8,
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { category: true },
      orderBy: { startDate: "asc" },
      take: 5,
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
  const lastMonthIncome = lastMonthTxGroups.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const lastMonthExpense = lastMonthTxGroups.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const monthlySavings = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((monthlySavings / monthIncome) * 100) : 0;
  const netWorth = (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0);

  const incomeChange = lastMonthIncome > 0 ? ((monthIncome - lastMonthIncome) / lastMonthIncome) * 100 : null;
  const expenseChange = lastMonthExpense > 0 ? ((monthExpense - lastMonthExpense) / lastMonthExpense) * 100 : null;

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

  return (
    <div className="space-y-6">
      {/* Header — no alert banner here, notifications live in the bell */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {now.toLocaleString("en-US", { month: "long", year: "numeric" })} overview
        </p>
      </div>

      {/* Redesigned stat cards — taller, number as hero */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth, currency)}
          icon={<Wallet className="h-4 w-4" />}
          accent="#6366f1"
          bg="from-indigo-50 to-indigo-50/30"
          valueColor="text-indigo-700"
        />
        <StatCard
          title="Month Income"
          value={formatCurrency(monthIncome, currency)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#22c55e"
          bg="from-green-50 to-green-50/30"
          valueColor="text-green-700"
          change={incomeChange}
          changeLabel="vs last month"
        />
        <StatCard
          title="Month Expenses"
          value={formatCurrency(monthExpense, currency)}
          icon={<TrendingDown className="h-4 w-4" />}
          accent="#ef4444"
          bg="from-red-50 to-red-50/30"
          valueColor="text-red-600"
          change={expenseChange}
          changeLabel="vs last month"
          invertChange
        />
        <StatCard
          title="Monthly Savings"
          value={formatCurrency(monthlySavings, currency)}
          icon={<PiggyBank className="h-4 w-4" />}
          accent="#8b5cf6"
          bg="from-purple-50 to-purple-50/30"
          valueColor={monthlySavings >= 0 ? "text-purple-700" : "text-red-600"}
        />

        {/* Savings rate card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className={`px-5 pt-4 pb-5 h-full bg-gradient-to-br ${
              savingsRate >= 20 ? "from-green-50 to-emerald-50/30"
              : savingsRate >= 10 ? "from-amber-50 to-amber-50/30"
              : "from-red-50 to-red-50/30"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Savings Rate</p>
                <div className="relative w-8 h-8 flex-shrink-0">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="16" cy="16" r="13" fill="none"
                      stroke={savingsRate >= 20 ? "#22c55e" : savingsRate >= 10 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${Math.max(0, Math.min(100, savingsRate)) * 0.817} 81.7`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-700">
                    {savingsRate}%
                  </span>
                </div>
              </div>
              <p className={`text-2xl font-bold tracking-tight ${
                savingsRate >= 20 ? "text-green-700"
                : savingsRate >= 10 ? "text-amber-600"
                : "text-red-600"
              }`}>
                {savingsRate >= 20 ? "Great 🎉" : savingsRate >= 10 ? "Fair" : savingsRate > 0 ? "Low" : "None"}
              </p>
              <p className="text-xs text-gray-500 mt-1">{savingsRate}% of income saved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts
        sixMonthsData={sixMonthsData}
        pieData={pieData}
        budgetData={budgetData}
        currency={currency}
        showOnboarding={showOnboarding}
      />

      {/* Top expenses */}
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
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-semibold text-gray-800 w-24 text-right">{formatCurrency(d.value, currency)}</span>
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
        {/* Goals */}
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

        {/* Recent Transactions */}
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
                    <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${t.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
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

function StatCard({ title, value, icon, accent, bg, valueColor, change, changeLabel, invertChange }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
  valueColor: string;
  change?: number | null;
  changeLabel?: string;
  invertChange?: boolean;
}) {
  const hasChange = change !== null && change !== undefined;
  // For expenses, going up is bad (red), going down is good (green) — invertChange handles this
  const changeGood = invertChange ? (change ?? 0) < 0 : (change ?? 0) >= 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`px-5 pt-4 pb-5 bg-gradient-to-br ${bg}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate pr-2">{title}</p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accent + "20", color: accent }}
            >
              {icon}
            </div>
          </div>
          <p className={`text-2xl font-bold tracking-tight leading-none ${valueColor}`} title={value}>
            {value}
          </p>
          {hasChange && (
            <p className={`text-xs mt-2 font-medium ${changeGood ? "text-green-600" : "text-red-500"}`}>
              {changeGood ? "▲" : "▼"} {Math.abs(change!).toFixed(1)}% {changeLabel}
            </p>
          )}
          {!hasChange && <p className="text-xs mt-2 text-gray-400">All time</p>}
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
      prisma.transaction.aggregate({ where: { userId, type: "INCOME", date: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", date: { gte: start, lte: end } }, _sum: { amount: true } }),
    ]);
    results.push({
      month: start.toLocaleString("en-US", { month: "short" }),
      income: inc._sum.amount ?? 0,
      expense: exp._sum.amount ?? 0,
    });
  }
  return results;
}
