"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { OnboardingModal } from "@/components/onboarding-modal";

interface Props {
  sixMonthsData: { month: string; income: number; expense: number }[];
  pieData: { name: string; value: number; color: string }[];
  budgetData: { name: string; budget: number; spent: number; color: string }[];
  currency: string;
  showOnboarding?: boolean;
}

export function DashboardCharts({ sixMonthsData, pieData, budgetData, currency, showOnboarding }: Props) {
  const fmt = (v: unknown) => formatCurrency(Number(v), currency);
  const [onboardingDone, setOnboardingDone] = useState(false);

  return (
    <>
      {showOnboarding && !onboardingDone && (
        <OnboardingModal onComplete={() => setOnboardingDone(true)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart — income vs expenses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sixMonthsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={fmt} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2.5}
                  fill="url(#incomeGrad)" name="Income" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#expenseGrad)" name="Expenses" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Custom legend */}
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-500">Expenses</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No expenses this month</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={fmt} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-1.5 max-h-28 overflow-y-auto mt-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600 truncate max-w-[100px]">{d.name}</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(d.value, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget vs actual */}
        {budgetData.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Budget vs Actual (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(120, budgetData.length * 45)}>
                <BarChart data={budgetData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120}
                    axisLine={false} tickLine={false} />
                  <Tooltip formatter={fmt} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="budget" fill="#e0e7ff" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" fill="#6366f1" name="Spent" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
