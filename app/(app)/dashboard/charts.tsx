"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Props {
  sixMonthsData: { month: string; income: number; expense: number }[];
  pieData: { name: string; value: number; color: string }[];
  budgetData: { name: string; budget: number; spent: number; color: string }[];
  currency: string;
}

export function DashboardCharts({ sixMonthsData, pieData, budgetData, currency }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Income vs Expenses (6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sixMonthsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expenses this month</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600 truncate max-w-[100px]">{d.name}</span>
                </div>
                <span className="font-medium text-gray-800">{formatCurrency(d.value, currency)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {budgetData.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Budget vs Actual (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={budgetData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend />
                <Bar dataKey="budget" fill="#c7d2fe" name="Budget" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" fill="#6366f1" name="Spent" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
