"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import dynamic from "next/dynamic";

const PDFExportButton = dynamic(
  () => import("@/components/reports/pdf-button").then((mod) => mod.PDFExportButton),
  { ssr: false, loading: () => <Button variant="outline" disabled><FileText className="h-4 w-4 mr-1.5" />Preparing PDF...</Button> }
);

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  byCategory: { name: string; color: string; type: string; total: number }[];
  monthly: { month: string; income: number; expense: number }[];
  transactions: any[];
}

export default function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/household")
      .then((r) => r.json())
      .then((json) => { if (json.household?.currency) setCurrency(json.household.currency); })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setPdfReady(false);
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
    setTimeout(() => setPdfReady(true), 300);
  }, [from, to]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Date", "Type", "Category", "Description", "Amount", "Member"],
      ...data.transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.category.name,
        t.description ?? "",
        t.amount.toFixed(2),
        t.user.name,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze your financial data</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button onClick={fetchReport} loading={loading}>
              <BarChart3 className="h-4 w-4 mr-1.5" /> Generate Report
            </Button>
            {data && (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            )}
            {data && pdfReady && (
              <PDFExportButton data={data} from={from} to={to} currency={currency} />
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(data.totalIncome, currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalExpense, currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-xs text-gray-500 font-medium uppercase">Net Savings</p>
                <p className={`text-2xl font-bold mt-1 ${data.netSavings >= 0 ? "text-indigo-600" : "text-red-600"}`}>
                  {formatCurrency(data.netSavings, currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
              <CardContent>
                {data.byCategory.filter((c) => c.type === "EXPENSE").length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No expense data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={data.byCategory.filter((c) => c.type === "EXPENSE")}
                        cx="50%" cy="50%" outerRadius={90} dataKey="total" nameKey="name"
                      >
                        {data.byCategory.filter((c) => c.type === "EXPENSE").map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.byCategory.sort((a, b) => b.total - a.total).map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.type === "INCOME" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>{c.type}</span>
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${c.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(c.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}