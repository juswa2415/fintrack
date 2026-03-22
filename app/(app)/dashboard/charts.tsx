"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { OnboardingModal } from "@/components/onboarding-modal";

interface Props {
  sixMonthsData: { month: string; income: number; expense: number }[];
  pieData: { name: string; value: number; color: string }[];
  budgetData: { name: string; budget: number; spent: number; color: string }[];
  currency: string;
  showOnboarding?: boolean;
}

function ThreeDotMenu({ options }: { options: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-[#E6E4DF] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.10)] z-20 overflow-hidden py-1">
            {options.map((o) => (
              <button key={o.label} onClick={() => { o.onClick(); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-[12px] text-[#6B6860] hover:bg-[#F4F3F0] hover:text-[#141414] transition-colors">
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardCharts({ sixMonthsData, pieData, budgetData, currency, showOnboarding }: Props) {
  const [chartView, setChartView] = useState<"both" | "income" | "expense">("both");
  const [onboardingDone, setOnboardingDone] = useState(false);

  const fmt = (v: unknown) => formatCurrency(Number(v), currency);

  const totalIncome = sixMonthsData.reduce((s, d) => s + d.income, 0);
  const totalExpense = sixMonthsData.reduce((s, d) => s + d.expense, 0);

  return (
    <>
      {showOnboarding && !onboardingDone && <OnboardingModal onComplete={() => setOnboardingDone(true)} />}

      <div className="space-y-4">
        {/* Cash flow chart — full width */}
        <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-[#141414] tracking-[-0.01em]">Cash Flow</p>
              <p className="text-[11px] text-[#A8A49E] mt-0.5">6-month trend</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle buttons */}
              <div className="flex items-center bg-[#F4F3F0] rounded-xl p-0.5 gap-0.5">
                {(["both", "income", "expense"] as const).map((v) => (
                  <button key={v} onClick={() => setChartView(v)}
                    className={`px-3 py-1.5 rounded-[10px] text-[11px] font-medium transition-all capitalize ${
                      chartView === v
                        ? "bg-white text-[#141414] shadow-sm"
                        : "text-[#A8A49E] hover:text-[#6B6860]"
                    }`}>
                    {v === "both" ? "All" : v}
                  </button>
                ))}
              </div>
              <ThreeDotMenu options={[
                { label: "View transactions", onClick: () => window.location.href = "/transactions" },
                { label: "View reports", onClick: () => window.location.href = "/reports" },
              ]} />
            </div>
          </div>

          {/* Summary stat row */}
          <div className="flex items-center gap-6 mb-4 pb-4 border-b border-[#EEEDE9]">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-[#16A34A]" />
                <p className="text-[11px] text-[#A8A49E]">Total income</p>
              </div>
              <p className="text-[15px] font-semibold text-[#141414] tabular-nums mt-0.5">{fmt(totalIncome)}</p>
            </div>
            <div className="w-px h-8 bg-[#EEEDE9]" />
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-[#DC2626]" />
                <p className="text-[11px] text-[#A8A49E]">Total expenses</p>
              </div>
              <p className="text-[15px] font-semibold text-[#141414] tabular-nums mt-0.5">{fmt(totalExpense)}</p>
            </div>
            <div className="w-px h-8 bg-[#EEEDE9]" />
            <div>
              <p className="text-[11px] text-[#A8A49E]">Net saved</p>
              <p className={`text-[15px] font-semibold tabular-nums mt-0.5 ${totalIncome - totalExpense >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {fmt(totalIncome - totalExpense)}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sixMonthsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#F0EEE9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A8A49E", fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#A8A49E", fontFamily: "DM Sans" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={fmt}
                contentStyle={{ background: "#fff", border: "1px solid #E6E4DF", borderRadius: "12px", fontSize: "12px", fontFamily: "DM Sans", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.10)" }}
                cursor={{ stroke: "#E6E4DF", strokeWidth: 1 }}
              />
              {(chartView === "both" || chartView === "income") && (
                <Area type="monotone" dataKey="income" stroke="#16A34A" strokeWidth={2}
                  fill="url(#gIncome)" name="Income" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#16A34A" }} />
              )}
              {(chartView === "both" || chartView === "expense") && (
                <Area type="monotone" dataKey="expense" stroke="#DC2626" strokeWidth={2}
                  fill="url(#gExpense)" name="Expenses" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#DC2626" }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            {(chartView === "both" || chartView === "income") && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded-full bg-[#16A34A] inline-block" />
                <span className="text-[11px] text-[#A8A49E]">Income</span>
              </div>
            )}
            {(chartView === "both" || chartView === "expense") && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded-full bg-[#DC2626] inline-block" />
                <span className="text-[11px] text-[#A8A49E]">Expenses</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: expenses pie + budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expenses by category donut */}
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-[#141414] tracking-[-0.01em]">Expenses by Category</p>
              <ThreeDotMenu options={[
                { label: "View transactions", onClick: () => window.location.href = "/transactions" },
                { label: "Go to budget", onClick: () => window.location.href = "/budget" },
              ]} />
            </div>
            {pieData.length === 0 ? (
              <p className="text-[12px] text-[#A8A49E] text-center py-8">No expenses this month</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[11px] text-[#6B6860] truncate max-w-[90px]">{d.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-[#141414] tabular-nums">{formatCurrency(d.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Budget bars */}
          {budgetData.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold text-[#141414] tracking-[-0.01em]">Budget vs Actual</p>
                <ThreeDotMenu options={[
                  { label: "Manage budgets", onClick: () => window.location.href = "/budget" },
                ]} />
              </div>
              <div className="space-y-3">
                {budgetData.slice(0, 5).map((b, i) => {
                  const pct = Math.min((b.spent / b.budget) * 100, 100);
                  const over = b.spent > b.budget;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[#6B6860]">{b.name}</span>
                        <span className={`text-[11px] font-medium tabular-nums ${over ? "text-[#DC2626]" : "text-[#141414]"}`}>
                          {formatCurrency(b.spent, currency)} <span className="text-[#A8A49E]">/ {formatCurrency(b.budget, currency)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#F4F3F0] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: over ? "#DC2626" : pct > 80 ? "#D97706" : b.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
