"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Target, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Goal {
  id: string; name: string; description: string | null;
  targetAmount: number; currentAmount: number;
  deadline: string | null; isCompleted: boolean;
  category: Category;
}

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  targetAmount: z.number().positive("Must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  deadline: z.string().optional(),
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
  const [addOpen, setAddOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const goalForm = useForm<GoalData>({ resolver: zodResolver(goalSchema) });
  const contributeForm = useForm<ContributeData>({ resolver: zodResolver(contributeSchema) });

  const fetchData = useCallback(async () => {
    const [g, c] = await Promise.all([
      fetch("/api/goals"),
      fetch("/api/categories?type=EXPENSE"),
    ]);
    setGoals(await g.json());
    setCategories(await c.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onAddGoal = async (data: GoalData) => {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setAddOpen(false);
    goalForm.reset();
    fetchData();
  };

  const onContribute = async (data: ContributeData) => {
    if (!contributeGoal) return;
    await fetch(`/api/goals/${contributeGoal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteTransactions: true }),
    });
    setDeleteGoal(null);
    setDeleting(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track your savings goals</p>
        </div>
        <Button onClick={() => { goalForm.reset(); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No goals yet. Create your first savings goal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            const remaining = g.targetAmount - g.currentAmount;
            return (
              <Card key={g.id} className={g.isCompleted ? "border-green-300 bg-green-50" : ""}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {g.isCompleted
                        ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        : <Target className="h-5 w-5 text-indigo-500 flex-shrink-0" />}
                      <h3 className="font-semibold text-gray-900 truncate">{g.name}</h3>
                    </div>
                    {!g.isCompleted && (
                      <button
                        onClick={() => setDeleteGoal(g)}
                        className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                        title="Delete goal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {g.description && <p className="text-xs text-gray-500 mb-3">{g.description}</p>}

                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: g.category.color + "20", color: g.category.color }}>
                      {g.category.name}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{formatCurrency(g.currentAmount, currency)} saved</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(g.targetAmount, currency)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${g.isCompleted ? "bg-green-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{pct.toFixed(0)}% complete</span>
                      {!g.isCompleted && <span>{formatCurrency(remaining, currency)} to go</span>}
                    </div>
                  </div>

                  {g.deadline && (
                    <p className="text-xs text-gray-400 mt-2">Deadline: {formatDate(g.deadline)}</p>
                  )}

                  {!g.isCompleted && (
                    <Button size="sm" className="w-full mt-4"
                      onClick={() => { contributeForm.reset(); setContributeGoal(g); }}>
                      Contribute
                    </Button>
                  )}
                  {g.isCompleted && (
                    <p className="text-sm font-medium text-green-700 text-center mt-3">🎉 Goal achieved!</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Goal Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Goal">
        <form onSubmit={goalForm.handleSubmit(onAddGoal)} className="space-y-4">
          <Input label="Goal Name" placeholder="e.g. New Dress, Emergency Fund"
            {...goalForm.register("name")} error={goalForm.formState.errors.name?.message} />
          <Input label="Description (optional)" placeholder="What are you saving for?"
            {...goalForm.register("description")} />
          <Input label="Target Amount" type="number" step="0.01"
            {...goalForm.register("targetAmount", { valueAsNumber: true })}
            error={goalForm.formState.errors.targetAmount?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Expense Category</label>
            <p className="text-xs text-gray-400">Every contribution will be recorded under this category</p>
            <select {...goalForm.register("categoryId")}
              className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {goalForm.formState.errors.categoryId && (
              <p className="text-xs text-red-600">{goalForm.formState.errors.categoryId.message}</p>
            )}
          </div>
          <Input label="Deadline (optional)" type="date" {...goalForm.register("deadline")} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={goalForm.formState.isSubmitting}>Create Goal</Button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal open={!!contributeGoal} onClose={() => setContributeGoal(null)}
        title={`Contribute to "${contributeGoal?.name}"`}>
        {contributeGoal && (
          <form onSubmit={contributeForm.handleSubmit(onContribute)} className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-xs text-indigo-700">
                This will be recorded as a{" "}
                <span className="font-semibold">{contributeGoal.category.name}</span> expense.
              </p>
            </div>
            <Input label="Amount" type="number" step="0.01"
              {...contributeForm.register("amount", { valueAsNumber: true })}
              error={contributeForm.formState.errors.amount?.message} />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setContributeGoal(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={contributeForm.formState.isSubmitting}>Contribute</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteGoal} onClose={() => setDeleteGoal(null)} title="Delete Goal">
        {deleteGoal && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Delete "{deleteGoal.name}"?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This will permanently delete the goal and all{" "}
                  <strong>{formatCurrency(deleteGoal.currentAmount, currency)}</strong> in contributions
                  from your transaction history. This cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              If you spent money toward this goal and want to keep those expense records, cancel and manually delete the goal instead by marking it complete.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteGoal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" loading={deleting} onClick={confirmDelete}>
                Delete Goal & Contributions
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
