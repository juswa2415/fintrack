"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, getCurrentMonthYear, getMonthName } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Trash2, PieChart, TrendingDown, Wallet } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Budget { id: string; amount: number; month: number; year: number; category: Category; }

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
    setBudgets(await bRes.json());
    setCategories(await catRes.json());
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 0, 23, 59, 59).toISOString();
    const txs  = await fetch(`/api/transactions?type=EXPENSE&from=${from}&to=${to}`).then((r) => r.json());
    const spendMap: Record<string, number> = {};
    for (const tx of txs) spendMap[tx.categoryId] = (spendMap[tx.categoryId] ?? 0) + tx.amount;
    setSpending(spendMap);
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: number) => {
    let m = month + dir, y = year;
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

  const availableCats  = categories.filter((c) => !budgets.some((b) => b.category.id === c.id));
  const totalBudget    = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent     = budgets.reduce((s, b) => s + (spending[b.category.id] ?? 0), 0);
  const overallPct     = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overBudgetCount = budgets.filter((b) => (spending[b.category.id] ?? 0) > b.amount).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">Budget</h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">Set and track spending limits</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-[#F4F3F0] rounded-xl p-1">
            <button onClick={() => navigate(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6860] hover:bg-white hover:text-[#141414] transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[13px] font-semibold text-[#141414] tracking-[-0.02em] px-2 min-w-[110px] text-center">
              {getMonthName(month)} {year}
            </span>
            <button onClick={() => navigate(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6860] hover:bg-white hover:text-[#141414] transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={() => { reset(); setModalOpen(true); }} disabled={availableCats.length === 0}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Set budget
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left — budget list (2/3 width) */}
        <div className="xl:col-span-2 space-y-3">
          {budgets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E6E4DF] flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F3F0] flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#A8A49E]" />
              </div>
              <p className="text-[14px] font-medium text-[#6B6860]">No budgets for {getMonthName(month)} {year}</p>
              <p className="text-[12px] text-[#A8A49E]">Click "Set budget" to add spending limits</p>
            </div>
          ) : (
            budgets.map((b) => {
              const spent = spending[b.category.id] ?? 0;
              const pct   = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
              const over  = spent > b.amount;
              const remaining = b.amount - spent;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-[#E6E4DF] p-5 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: b.category.color }}>
                        {b.category.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#141414]">{b.category.name}</span>
                          {over && (
                            <span className="text-[10px] font-semibold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded-full">Over budget</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#A8A49E]">
                          {over
                            ? `${formatCurrency(Math.abs(remaining), currency)} over`
                            : `${formatCurrency(remaining, currency)} remaining`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-[14px] font-semibold tabular-nums ${over ? "text-[#DC2626]" : "text-[#141414]"}`}>
                          {formatCurrency(spent, currency)}
                        </p>
                        <p className="text-[11px] text-[#A8A49E]">of {formatCurrency(b.amount, currency)}</p>
                      </div>
                      <button onClick={() => deleteBudget(b.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#A8A49E] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F4F3F0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: over ? "#DC2626" : pct > 80 ? "#D97706" : b.category.color }} />
                  </div>
                  <p className="text-[10px] text-[#A8A49E] mt-1.5">{pct.toFixed(0)}% used</p>
                </div>
              );
            })
          )}
        </div>

        {/* Right — overview panel (1/3 width) */}
        <div className="xl:col-span-1 space-y-4">

          {/* Overall summary */}
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
            <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-4">Overview</p>
            {totalBudget === 0 ? (
              <p className="text-[12px] text-[#A8A49E] text-center py-4">Set budgets to see overview</p>
            ) : (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-[#A8A49E]">Spent</p>
                    <p className="text-[22px] font-semibold tabular-nums tracking-tight text-[#141414]">
                      {formatCurrency(totalSpent, currency)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                    overallPct > 100 ? "bg-[#FEE2E2] text-[#DC2626]"
                    : overallPct > 80 ? "bg-[#FEF3C7] text-[#D97706]"
                    : "bg-[#DCFCE7] text-[#16A34A]"
                  }`}>
                    {overallPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-[#F4F3F0] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%`, backgroundColor: overallPct > 100 ? "#DC2626" : overallPct > 80 ? "#D97706" : "#141414" }} />
                </div>
                <p className="text-[11px] text-[#A8A49E]">of {formatCurrency(totalBudget, currency)} total budget</p>

                <div className="mt-4 pt-4 border-t border-[#EEEDE9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6B6860]">Remaining</span>
                    <span className={`text-[12px] font-semibold tabular-nums ${totalBudget - totalSpent >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {formatCurrency(totalBudget - totalSpent, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6B6860]">Categories</span>
                    <span className="text-[12px] font-semibold text-[#141414]">{budgets.length}</span>
                  </div>
                  {overBudgetCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6B6860]">Over budget</span>
                      <span className="text-[12px] font-semibold text-[#DC2626]">{overBudgetCount}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Per-category mini breakdown */}
          {budgets.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E6E4DF] p-5">
              <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-3">Breakdown</p>
              <div className="space-y-2.5">
                {budgets.slice(0, 6).map((b) => {
                  const spent = spending[b.category.id] ?? 0;
                  const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
                  return (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.category.color }} />
                      <span className="text-[12px] text-[#6B6860] flex-1 truncate">{b.category.name}</span>
                      <span className={`text-[11px] font-medium tabular-nums ${pct > 100 ? "text-[#DC2626]" : "text-[#141414]"}`}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="bg-[#F4F3F0] rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <TrendingDown className="h-4 w-4 text-[#6B6860] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#141414] mb-0.5">Budget tip</p>
                <p className="text-[11px] text-[#6B6860] leading-relaxed">
                  Aim to keep total spending below 80% of your budget to build a healthy financial cushion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Set Budget — ${getMonthName(month)} ${year}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#6B6860] uppercase tracking-wide">Category</label>
            <select {...register("categoryId")}
              className="h-9 w-full rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] px-3 text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
              <option value="">Select expense category</option>
              {availableCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-[11px] text-red-500">Required</p>}
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Budget Limit</label>
            <Input type="number" step="0.01" placeholder="0.00"
              {...register("amount", { valueAsNumber: true })} />
            {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>Save Budget</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
