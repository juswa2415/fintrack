"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Target, Trash2, CheckCircle2 } from "lucide-react";

interface Goal {
  id: string; name: string; description: string | null;
  targetAmount: number; currentAmount: number;
  deadline: string | null; isCompleted: boolean;
}
interface Category { id: string; name: string; type: string; }

const goalSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  deadline: z.string().optional(),
});
const contributeSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().min(1),
});

type GoalData = z.infer<typeof goalSchema>;
type ContributeData = z.infer<typeof contributeSchema>;

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const { register: rGoal, handleSubmit: hGoal, reset: resetGoal, formState: { errors: eGoal, isSubmitting: sGoal } } =
    useForm<GoalData>({ resolver: zodResolver(goalSchema) });

  const { register: rCon, handleSubmit: hCon, reset: resetCon, formState: { errors: eCon, isSubmitting: sCon } } =
    useForm<ContributeData>({ resolver: zodResolver(contributeSchema) });

  const fetchData = useCallback(async () => {
    const [g, c] = await Promise.all([fetch("/api/goals"), fetch("/api/categories?type=EXPENSE")]);
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
    resetGoal();
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
    resetCon();
    fetchData();
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchData();
  };

  const savingsCats = categories.filter((c) => c.name.toLowerCase().includes("saving") || c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track your savings goals</p>
        </div>
        <Button onClick={() => { resetGoal(); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No goals yet. Create your first savings goal!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            const remaining = g.targetAmount - g.currentAmount;
            return (
              <Card key={g.id} className={g.isCompleted ? "border-green-300 bg-green-50" : ""}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {g.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Target className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900">{g.name}</h3>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {g.description && <p className="text-xs text-gray-500 mb-3">{g.description}</p>}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{formatCurrency(g.currentAmount)} saved</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(g.targetAmount)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${g.isCompleted ? "bg-green-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{pct.toFixed(0)}% complete</span>
                      {!g.isCompleted && <span>{formatCurrency(remaining)} to go</span>}
                    </div>
                  </div>

                  {g.deadline && (
                    <p className="text-xs text-gray-400 mt-2">Deadline: {formatDate(g.deadline)}</p>
                  )}

                  {!g.isCompleted && (
                    <Button size="sm" className="w-full mt-4" onClick={() => { resetCon(); setContributeGoal(g); }}>
                      Contribute
                    </Button>
                  )}
                  {g.isCompleted && (
                    <p className="text-sm font-medium text-green-700 text-center mt-3">Goal achieved!</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Goal">
        <form onSubmit={hGoal(onAddGoal)} className="space-y-4">
          <Input label="Goal Name" placeholder="e.g. Emergency Fund" {...rGoal("name")} error={eGoal.name?.message} />
          <Input label="Description (optional)" placeholder="What are you saving for?" {...rGoal("description")} />
          <Input label="Target Amount" type="number" step="0.01" {...rGoal("targetAmount", { valueAsNumber: true })} error={eGoal.targetAmount?.message} />
          <Input label="Deadline (optional)" type="date" {...rGoal("deadline")} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={sGoal}>Create Goal</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!contributeGoal} onClose={() => setContributeGoal(null)} title={`Contribute to "${contributeGoal?.name}"`}>
        <form onSubmit={hCon(onContribute)} className="space-y-4">
          <Input label="Amount" type="number" step="0.01" {...rCon("amount", { valueAsNumber: true })} error={eCon.amount?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Expense Category</label>
            <select {...rCon("categoryId")} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category</option>
              {savingsCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {eCon.categoryId && <p className="text-xs text-red-600">Required</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setContributeGoal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={sCon}>Contribute</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
