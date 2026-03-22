"use client";

import { useState, useCallback } from "react";
import { useCurrency } from "@/lib/use-currency";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, BarChart3, TrendingUp, TrendingDown, Wallet, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  byCategory: { name: string; color: string; type: string; total: number }[];
  monthly: { month: string; income: number; expense: number }[];
  transactions: any[];
}

export default function ReportsPage() {
  const currency = useCurrency();
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [to, setTo]     = useState(today.toISOString().split("T")[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
  }, [from, to]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Date", "Type", "Category", "Description", "Amount"],
      ...data.transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(), t.type,
        t.category.name, t.description ?? "", t.amount.toFixed(2),
      ]),
    ];
    const csv  = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `fintrack-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: unknown) => formatCurrency(Number(v), currency);
  const expenseCategories = data?.byCategory.filter((c) => c.type === "EXPENSE") ?? [];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">Reports</h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">Analyze your financial data</p>
        </div>
        {data && (
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        )}
      </div>

      {/* Date range + generate */}
      <div className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-1.5 block">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] px-3 text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-1.5 block">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] px-3 text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10" />
          </div>
          <Button onClick={fetchReport} loading={loading}>
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Generate report
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div className="bg-white rounded-2xl border border-[#E6E4DF] flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F3F0] flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-[#A8A49E]" />
          </div>
          <p className="text-[14px] font-medium text-[#6B6860]">No report generated yet</p>
          <p className="text-[12px] text-[#A8A49E]">Select a date range and click Generate report</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-[#16A34A]" />
                <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest">Total Income</p>
              </div>
              <p className="text-[24px] font-semibold tracking-[-0.04em] tabular-nums text-[#16A34A]">
                {formatCurrency(data.totalIncome, currency)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-[#DC2626]" />
                <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest">Total Expenses</p>
              </div>
              <p className="text-[24px] font-semibold tracking-[-0.04em] tabular-nums text-[#141414]">
                {formatCurrency(data.totalExpense, currency)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-[#6B6860]" />
                <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest">Net Savings</p>
              </div>
              <p className={`text-[24px] font-semibold tracking-[-0.04em] tabular-nums ${data.netSavings >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {formatCurrency(data.netSavings, currency)}
              </p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly trend bar chart */}
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[13px] font-semibold text-[#141414] tracking-[-0.01em] mb-4">Monthly Trend</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#F0EEE9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A8A49E", fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A8A49E", fontFamily: "DM Sans" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={fmt}
                    contentStyle={{ background: "#fff", border: "1px solid #E6E4DF", borderRadius: "12px", fontSize: "12px", fontFamily: "DM Sans", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.10)" }} />
                  <Bar dataKey="income"  fill="#16A34A" name="Income"   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#141414" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]" /><span className="text-[11px] text-[#A8A49E]">Income</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#141414]" /><span className="text-[11px] text-[#A8A49E]">Expenses</span></div>
              </div>
            </div>

            {/* Expense donut */}
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[13px] font-semibold text-[#141414] tracking-[-0.01em] mb-4">Expenses by Category</p>
              {expenseCategories.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-[#A8A49E] text-[12px]">
                  No expense data in range
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                        paddingAngle={2} dataKey="total" startAngle={90} endAngle={-270}>
                        {expenseCategories.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2 overflow-hidden">
                    {expenseCategories.slice(0, 7).map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-[11px] text-[#6B6860] truncate">{c.name}</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#141414] tabular-nums ml-2 flex-shrink-0">
                          {formatCurrency(c.total, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown table */}
          <div className="bg-white rounded-2xl border border-[#E6E4DF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEEDE9] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#A8A49E]" />
              <p className="text-[13px] font-semibold text-[#141414]">Category Breakdown</p>
            </div>
            <div className="divide-y divide-[#F4F3F0]">
              {data.byCategory.sort((a, b) => b.total - a.total).map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF8] transition-colors">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: c.color }}>
                    {c.name[0]}
                  </span>
                  <span className="text-[13px] text-[#141414] font-medium flex-1">{c.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.type === "INCOME" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F0] text-[#6B6860]"
                  }`}>
                    {c.type === "INCOME" ? "Income" : "Expense"}
                  </span>
                  <span className={`text-[13px] font-semibold tabular-nums ml-4 ${c.type === "INCOME" ? "text-[#16A34A]" : "text-[#141414]"}`}>
                    {formatCurrency(c.total, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
