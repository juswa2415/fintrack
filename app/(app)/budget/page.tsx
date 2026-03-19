"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, getCurrentMonthYear, getMonthName } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Budget { id: string; amount: number; month: number; year: number; category: Category; }
interface SpendData { categoryId: string; _sum: { amount: number | null }; }

const schema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
});
type FormData = z.infer<typeof schema>;

export default function BudgetPage() {
  const currency = useCurrency();
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const fetchData = useCallback(async () => {
    const [bRes, catRes] = await Promise.all([
      fetch(`/api/budget?month=${month}&year=${year}`),
      fetch("/api/categories?type=EXPENSE"),
    ]);
    const budgetData: Budget[] = await bRes.json();
    setBudgets(budgetData);
    setCategories(await catRes.json());

    const from = new Date(year, month - 1, 1).toISOString();
    const to = new Date(year, month, 0, 23, 59, 59).toISOString();
    const txRes = await fetch(`/api/transactions?type=EXPENSE&from=${from}&to=${to}`);
    const txs = await txRes.json();
    const spendMap: Record<string, number> = {};
    for (const tx of txs) {
      spendMap[tx.categoryId] = (spendMap[tx.categoryId] ?? 0) + tx.amount;
    }
    setSpending(spendMap);
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const onSubmit = async (data: FormData) => {
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, month, year }),
    });
    setModalOpen(false);
    reset();
    fetchData();
  };

  const deleteBudget = async (id: string) => {
    await fetch(`/api/budget/${id}`, { method: "DELETE" });
    fetchData();
  };

  const availableCats = categories.filter((c) => !budgets.some((b) => b.category.id === c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-sm text-gray-500 mt-1">Set and track spending limits per category</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true); }} disabled={availableCats.length === 0}>
          <Plus className="h-4 w-4 mr-1.5" /> Set Budget
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
          {getMonthName(month)} {year}
        </span>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            No budgets set for {getMonthName(month)} {year}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((b) => {
            const spent = spending[b.category.id] ?? 0;
            const pct = Math.min((spent / b.amount) * 100, 100);
            const over = spent > b.amount;
            return (
              <Card key={b.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.category.color }} />
                      <span className="font-medium text-gray-800">{b.category.name}</span>
                      {over && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Over budget</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {formatCurrency(spent, currency)} / {formatCurrency(b.amount, currency)}
                      </span>
                      <button onClick={() => deleteBudget(b.id)} className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(0)}% used</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Set Budget — ${getMonthName(month)} ${year}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select {...register("categoryId")} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select expense category</option>
              {availableCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600">Required</p>}
          </div>
          <Input label="Budget Limit" type="number" step="0.01" placeholder="0.00" {...register("amount", { valueAsNumber: true })} error={errors.amount?.message} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>Save Budget</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
