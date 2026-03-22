import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "./charts";
import { CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const first = name.split(" ")[0];
  if (h < 12) return `Good morning, ${first} 👋`;
  if (h < 17) return `Good afternoon, ${first} 👋`;
  return `Good evening, ${first} 👋`;
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true, name: true, hasSeenOnboarding: true },
  });
  const currency      = user?.currency ?? "USD";
  const showOnboarding = !user?.hasSeenOnboarding;

  const now           = new Date();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd      = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    monthGroups, lastMonthGroups, recentTx,
    budgets,
    // FIX: No take:6 cap — fetch ALL expense categories for this month so budget
    // calculations are never silently zero for categories outside the top 6.
    allExpenseCats,
    goals,
    totalIncome, totalExpense,
  ] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where: { userId: session.user.id, date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["type"], where: { userId: session.user.id, date: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { userId: session.user.id }, include: { category: true }, orderBy: { date: "desc" }, take: 8 }),
    prisma.budget.findMany({ where: { userId: session.user.id, month: now.getMonth() + 1, year: now.getFullYear() }, include: { category: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: session.user.id, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      // Removed take:6 — budget widget needs the full picture
    }),
    prisma.goal.findMany({ where: { userId: session.user.id }, include: { category: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.transaction.aggregate({ where: { userId: session.user.id, type: "INCOME" },  _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId: session.user.id, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);

  // Keep top-6 slice only for the pie chart (visual, not calculations)
  const expenseCatsForPie = allExpenseCats.slice(0, 6);

  const sixMonthsData = await getSixMonths(session.user.id);

  const monthIncome  = monthGroups.find((t) => t.type === "INCOME")?._sum.amount  ?? 0;
  const monthExpense = monthGroups.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const lastIncome   = lastMonthGroups.find((t) => t.type === "INCOME")?._sum.amount  ?? 0;
  const lastExpense  = lastMonthGroups.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const savings      = monthIncome - monthExpense;
  const savingsRate  = monthIncome > 0 ? Math.round((savings / monthIncome) * 100) : 0;
  const netWorth     = (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0);

  const incomeChange  = lastIncome  > 0 ? ((monthIncome  - lastIncome)  / lastIncome)  * 100 : null;
  const expenseChange = lastExpense > 0 ? ((monthExpense - lastExpense) / lastExpense) * 100 : null;

  const catMap  = await prisma.category.findMany({ where: { userId: session.user.id } });
  const catById = Object.fromEntries(catMap.map((c) => [c.id, c]));

  const pieData = expenseCatsForPie.map((e) => ({
    name:  catById[e.categoryId]?.name  ?? "?",
    value: e._sum.amount ?? 0,
    color: catById[e.categoryId]?.color ?? "#ccc",
  }));

  // FIX: build spendByCat from the FULL (uncapped) allExpenseCats list
  const spendByCat = Object.fromEntries(allExpenseCats.map((e) => [e.categoryId, e._sum.amount ?? 0]));
  const budgetData = budgets.map((b) => ({
    name:   b.category.name,
    budget: b.amount,
    spent:  spendByCat[b.categoryId] ?? 0,   // was silently 0 if outside top-6
    color:  b.category.color,
  }));

  // FIX: serialise goals to plain objects so no Date instances reach the client component
  const goalsForClient = goals.map((g) => ({
    id:            g.id,
    name:          g.name,
    targetAmount:  g.targetAmount,
    currentAmount: g.currentAmount,
    isCompleted:   g.isCompleted,
    deadline:      g.deadline ? g.deadline.toISOString() : null,
    category: {
      id:    g.category.id,
      name:  g.category.name,
      color: g.category.color,
    },
  }));

  // FIX: serialise recentTx dates to ISO strings for the client
  const recentTxForClient = recentTx.map((t) => ({
    id:          t.id,
    amount:      t.amount,
    type:        t.type,
    date:        t.date.toISOString(),
    description: t.description,
    category: {
      id:    t.category.id,
      name:  t.category.name,
      color: t.category.color,
    },
  }));

  const activeGoals    = goalsForClient.filter((g) => !g.isCompleted);
  const completedGoals = goalsForClient.filter((g) =>  g.isCompleted);

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">
            {getGreeting(user?.name ?? "there")}
          </h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ASYMMETRIC LAYOUT — 3 columns left (hero) + 1 column right (insights) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* ───── LEFT — 3 columns ───── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Hero stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Net Worth — hero card, spans 2 cols on lg */}
            <div className="lg:col-span-2 bg-[#141414] rounded-2xl p-5 text-white">
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest mb-3">Net Worth</p>
              <p className="text-[32px] font-semibold tracking-[-0.04em] tabular-nums leading-none">
                {formatCurrency(netWorth, currency)}
              </p>
              <p className="text-[11px] text-white/40 mt-2">All-time balance</p>
            </div>

            {/* Monthly savings */}
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[11px] font-medium text-[#A8A49E] uppercase tracking-widest mb-3">Savings</p>
              <p className={`text-[22px] font-semibold tracking-[-0.03em] tabular-nums leading-none ${savings >= 0 ? "text-[#141414]" : "text-[#DC2626]"}`}>
                {formatCurrency(savings, currency)}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <span className={`text-[11px] font-medium ${savingsRate >= 20 ? "text-[#16A34A]" : savingsRate >= 10 ? "text-[#D97706]" : "text-[#DC2626]"}`}>
                  {savingsRate}% rate
                </span>
              </div>
            </div>

            {/* Income this month */}
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[11px] font-medium text-[#A8A49E] uppercase tracking-widest mb-3">Income</p>
              <p className="text-[22px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#141414]">
                {formatCurrency(monthIncome, currency)}
              </p>
              {incomeChange !== null && (
                <div className={`mt-2 flex items-center gap-0.5 ${incomeChange >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span className="text-[11px] font-medium">{Math.abs(incomeChange).toFixed(1)}% vs last month</span>
                </div>
              )}
            </div>
          </div>

          {/* Expenses stat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[11px] font-medium text-[#A8A49E] uppercase tracking-widest mb-3">Expenses</p>
              <p className="text-[22px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#141414]">
                {formatCurrency(monthExpense, currency)}
              </p>
              {expenseChange !== null && (
                <div className={`mt-2 flex items-center gap-0.5 ${expenseChange <= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {expenseChange <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  <span className="text-[11px] font-medium">{Math.abs(expenseChange).toFixed(1)}% vs last month</span>
                </div>
              )}
            </div>

            {/* Top expense category cards — 2 mini cards */}
            {pieData.slice(0, 2).map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <p className="text-[11px] font-medium text-[#A8A49E] uppercase tracking-widest truncate">{d.name}</p>
                </div>
                <p className="text-[22px] font-semibold tracking-[-0.03em] tabular-nums leading-none text-[#141414]">
                  {formatCurrency(d.value, currency)}
                </p>
                <p className="text-[11px] text-[#A8A49E] mt-2">
                  {Math.round((d.value / monthExpense) * 100)}% of expenses
                </p>
              </div>
            ))}
          </div>

          {/* Charts section — onboarding modal lives here (client component) */}
          <DashboardCharts
            sixMonthsData={sixMonthsData}
            pieData={pieData}
            budgetData={budgetData}
            currency={currency}
            showOnboarding={showOnboarding}
          />
        </div>

        {/* ───── RIGHT — insight panel ───── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Financial health gauge */}
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-[#141414]">Financial Health</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${savingsRate >= 20 ? "bg-[#DCFCE7] text-[#16A34A]" : savingsRate >= 10 ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                {savingsRate >= 20 ? "On track" : savingsRate >= 10 ? "Fair" : "At risk"}
              </span>
            </div>

            {/* Semicircle gauge */}
            <div className="flex flex-col items-center py-2">
              <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#F4F3F0" strokeWidth="10" strokeLinecap="round" />
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none"
                  stroke={savingsRate >= 20 ? "#16A34A" : savingsRate >= 10 ? "#D97706" : "#DC2626"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${Math.min(savingsRate, 100) * 1.571} 157.1`}
                />
                <circle cx="60" cy="65" r="4" fill={savingsRate >= 20 ? "#16A34A" : savingsRate >= 10 ? "#D97706" : "#DC2626"} />
              </svg>
              <p className="text-[28px] font-semibold tracking-[-0.04em] text-[#141414] -mt-2">{savingsRate}%</p>
              <p className="text-[11px] text-[#A8A49E] mt-0.5">of monthly income saved</p>
            </div>

            <p className="text-[11px] text-[#A8A49E] text-center mt-3 pb-1">
              Based on this month&apos;s data
            </p>
          </div>

          {/* Goals — with progress bars */}
          {goalsForClient.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold text-[#141414]">Goals</p>
                <Link href="/goals" className="text-[11px] text-[#A8A49E] hover:text-[#141414] transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-4">
                {activeGoals.map((g) => {
                  const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                  const daysLeft = g.deadline
                    ? Math.floor((new Date(g.deadline).getTime() - Date.now()) / 86_400_000)
                    : null;
                  const urgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: g.category.color }}
                          />
                          <span className="text-[12px] font-medium text-[#141414] truncate">{g.name}</span>
                        </div>
                        <span className="text-[10px] text-[#A8A49E] tabular-nums ml-2 flex-shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-[#F4F3F0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct >= 100 ? "#16A34A" :
                              urgent       ? "#D97706" :
                              g.category.color,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-[#A8A49E]">
                          {formatCurrency(g.currentAmount, currency)} / {formatCurrency(g.targetAmount, currency)}
                        </p>
                        {daysLeft !== null && daysLeft >= 0 && (
                          <p className={`text-[10px] font-medium ${urgent ? "text-[#D97706]" : "text-[#A8A49E]"}`}>
                            {daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {completedGoals.slice(0, 1).map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] flex-shrink-0" />
                    <span className="text-[11px] text-[#A8A49E] line-through truncate">{g.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-[#141414]">Recent</p>
              <Link href="/transactions" className="text-[11px] text-[#A8A49E] hover:text-[#141414] transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentTxForClient.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: t.category.color }}
                  >
                    {t.category.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#141414] truncate">
                      {t.description || t.category.name}
                    </p>
                    <p className="text-[10px] text-[#A8A49E]">
                      {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-[12px] font-semibold tabular-nums flex-shrink-0 ${t.type === "INCOME" ? "text-[#16A34A]" : "text-[#141414]"}`}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

async function getSixMonths(userId: string) {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId, type: "INCOME",  date: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", date: { gte: start, lte: end } }, _sum: { amount: true } }),
    ]);
    results.push({
      month:   start.toLocaleString("en-US", { month: "short" }),
      income:  inc._sum.amount ?? 0,
      expense: exp._sum.amount ?? 0,
    });
  }
  return results;
}
