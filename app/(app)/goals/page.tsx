"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Target, Trash2, CheckCircle2, AlertTriangle, Calendar, TrendingUp } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Goal {
  id: string; name: string; description: string | null;
  targetAmount: number; currentAmount: number;
  deadline: string | null; isCompleted: boolean;
  category: Category;
}

const goalSchema = z.object({
  name:         z.string().min(1, "Name is required"),
  description:  z.string().optional(),
  targetAmount: z.number().positive("Must be positive"),
  categoryId:   z.string().min(1, "Category is required"),
  deadline:     z.string().optional(),
});
const contributeSchema = z.object({
  amount: z.number().positive("Must be positive"),
});

type GoalData = z.infer<typeof goalSchema>;
type ContributeData = z.infer<typeof contributeSchema>;

export default function GoalsPage() {
  const currency = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const goalForm = useForm<GoalData>({ resolver: zodResolver(goalSchema) });
  const contributeForm = useForm<ContributeData>({ resolver: zodResolver(contributeSchema) });

  const fetchData = useCallback(async () => {
    const [g, c] = await Promise.all([fetch("/api/goals"), fetch("/api/categories?type=EXPENSE")]);
    setGoals(await g.json());
    setCategories(await c.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onAddGoal = async (data: GoalData) => {
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setAddOpen(false);
    goalForm.reset();
    fetchData();
  };

  const onContribute = async (data: ContributeData) => {
    if (!contributeGoal) return;
    await fetch(`/api/goals/${contributeGoal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, contribute: true }),
    });
    setContributeGoal(null);
    contributeForm.reset();
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteGoal) return;
    setDeleting(true);
    await fetch(`/api/goals/${deleteGoal.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteTransactions: true }),
    });
    setDeleteGoal(null);
    setDeleting(false);
    fetchData();
  };

  const active    = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">Goals</h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">Track your savings goals</p>
        </div>
        <Button onClick={() => { goalForm.reset(); setAddOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New goal
        </Button>
      </div>

      {/* Loading skeleton — prevents flash of empty state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E6E4DF] p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F4F3F0]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-[#F4F3F0] rounded w-2/3" />
                  <div className="h-2.5 bg-[#F4F3F0] rounded w-1/3" />
                </div>
              </div>
              <div className="h-1.5 bg-[#F4F3F0] rounded-full" />
              <div className="h-8 bg-[#F4F3F0] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — only shown after loading completes */}
      {!loading && goals.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E6E4DF] flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F3F0] flex items-center justify-center">
            <Target className="h-6 w-6 text-[#A8A49E]" />
          </div>
          <p className="text-[14px] font-medium text-[#6B6860]">No goals yet</p>
          <p className="text-[12px] text-[#A8A49E]">Create your first savings goal to get started</p>
          <Button onClick={() => { goalForm.reset(); setAddOpen(true); }} className="mt-2">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New goal
          </Button>
        </div>
      )}

      {/* Active goals grid */}
      {!loading && active.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-3">
            Active — {active.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((g) => {
              const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
              const remaining = g.targetAmount - g.currentAmount;
              const daysLeft = g.deadline
                ? Math.floor((new Date(g.deadline).getTime() - Date.now()) / 86_400_000)
                : null;
              const urgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

              return (
                <div key={g.id} className="bg-white rounded-2xl border border-[#E6E4DF] p-5 flex flex-col group">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                        style={{ backgroundColor: g.category.color }}>
                        {g.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#141414] truncate">{g.name}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: g.category.color + "20", color: g.category.color }}>
                          {g.category.name}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setDeleteGoal(g)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#A8A49E] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {g.description && (
                    <p className="text-[11px] text-[#A8A49E] mb-3 -mt-1">{g.description}</p>
                  )}

                  {/* Progress */}
                  <div className="flex-1 space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#A8A49E]">
                        {formatCurrency(g.currentAmount, currency)} saved
                      </span>
                      <span className="text-[11px] font-semibold text-[#141414] tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#F4F3F0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: urgent ? "#D97706" : g.category.color,
                        }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#A8A49E]">
                        {formatCurrency(remaining, currency)} to go
                      </span>
                      <span className="text-[11px] font-medium text-[#141414] tabular-nums">
                        {formatCurrency(g.targetAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Deadline */}
                  {g.deadline && (
                    <div className={`flex items-center gap-1.5 mb-3 text-[11px] font-medium ${urgent ? "text-[#D97706]" : "text-[#A8A49E]"}`}>
                      <Calendar className="h-3 w-3" />
                      {daysLeft === 0 ? "Due today" : daysLeft !== null && daysLeft > 0
                        ? `${daysLeft} days left`
                        : formatDate(g.deadline)}
                    </div>
                  )}

                  <Button size="sm" className="w-full"
                    onClick={() => { contributeForm.reset(); setContributeGoal(g); }}>
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Contribute
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {!loading && completed.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-widest mb-3">
            Completed — {completed.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completed.map((g) => (
              <div key={g.id} className="bg-[#F4F3F0] rounded-2xl border border-[#E6E4DF] p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-[#16A34A] flex-shrink-0" />
                  <p className="text-[13px] font-semibold text-[#141414] truncate">{g.name}</p>
                </div>
                <div className="h-1.5 bg-[#DCFCE7] rounded-full mb-2">
                  <div className="h-full w-full rounded-full bg-[#16A34A]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#16A34A] font-medium">🎉 Goal achieved!</span>
                  <span className="text-[11px] font-semibold text-[#141414] tabular-nums">
                    {formatCurrency(g.targetAmount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New goal">
        <form onSubmit={goalForm.handleSubmit(onAddGoal)} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Goal name</label>
            <Input placeholder="e.g. New Dress, Emergency Fund"
              {...goalForm.register("name")} />
            {goalForm.formState.errors.name && <p className="text-[11px] text-red-500 mt-1">{goalForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Description (optional)</label>
            <Input placeholder="What are you saving for?" {...goalForm.register("description")} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Target amount</label>
            <Input type="number" step="0.01"
              {...goalForm.register("targetAmount", { valueAsNumber: true })} />
            {goalForm.formState.errors.targetAmount && <p className="text-[11px] text-red-500 mt-1">{goalForm.formState.errors.targetAmount.message}</p>}
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Expense category</label>
            <p className="text-[11px] text-[#A8A49E] mb-1.5">Every contribution will be recorded under this category</p>
            <select {...goalForm.register("categoryId")}
              className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-white text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {goalForm.formState.errors.categoryId && <p className="text-[11px] text-red-500 mt-1">{goalForm.formState.errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Deadline (optional)</label>
            <Input type="date" {...goalForm.register("deadline")} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={goalForm.formState.isSubmitting}>Create goal</Button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal open={!!contributeGoal} onClose={() => setContributeGoal(null)}
        title={`Contribute to "${contributeGoal?.name}"`}>
        {contributeGoal && (
          <form onSubmit={contributeForm.handleSubmit(onContribute)} className="space-y-4">
            <div className="p-3 rounded-xl bg-[#F4F3F0] border border-[#E6E4DF]">
              <p className="text-[12px] text-[#6B6860]">
                Recorded as a <span className="font-semibold text-[#141414]">{contributeGoal.category.name}</span> expense.
              </p>
              <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min((contributeGoal.currentAmount / contributeGoal.targetAmount) * 100, 100)}%`,
                  backgroundColor: contributeGoal.category.color,
                }} />
              </div>
              <p className="text-[11px] text-[#A8A49E] mt-1">
                {formatCurrency(contributeGoal.currentAmount, currency)} / {formatCurrency(contributeGoal.targetAmount, currency)}
              </p>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Amount</label>
              <Input type="number" step="0.01"
                {...contributeForm.register("amount", { valueAsNumber: true })} />
              {contributeForm.formState.errors.amount && <p className="text-[11px] text-red-500 mt-1">{contributeForm.formState.errors.amount.message}</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setContributeGoal(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={contributeForm.formState.isSubmitting}>Contribute</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteGoal} onClose={() => setDeleteGoal(null)} title="Delete goal?">
        {deleteGoal && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FEE2E2] border border-red-200">
              <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#DC2626]">Delete "{deleteGoal.name}"?</p>
                <p className="text-[11px] text-[#DC2626]/80 mt-0.5">
                  This will permanently delete the goal and all {formatCurrency(deleteGoal.currentAmount, currency)} in contributions. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteGoal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" loading={deleting} onClick={confirmDelete}>
                Delete goal
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
