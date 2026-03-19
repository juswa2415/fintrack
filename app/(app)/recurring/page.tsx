"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { Plus, PlayCircle, Trash2 } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Recurring {
  id: string; amount: number; type: string; frequency: string;
  description: string | null; category: Category;
  user: { name: string }; lastLogged: string | null; startDate: string;
}

const schema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const FREQUENCIES = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", frequency: "MONTHLY", startDate: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");

  const fetchData = useCallback(async () => {
    const [r, c] = await Promise.all([fetch("/api/recurring"), fetch("/api/categories")]);
    setItems(await r.json());
    setCategories(await c.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: FormData) => {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModalOpen(false);
    reset();
    fetchData();
  };

  const logNow = async (id: string) => {
    await fetch(`/api/recurring/${id}`, { method: "POST" });
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Deactivate this recurring transaction?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filteredCats = categories.filter((c) => !selectedType || c.type === selectedType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage automatic income and expenses</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Recurring
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-400">
              No recurring transactions yet. Add one to get started.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: item.category.color }}
                  >
                    {item.category.name[0]}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{item.description || item.category.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.category.name} · {item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()} · {item.user?.name ?? "Deleted User"}
                    </p>
                    {item.lastLogged && (
                      <p className="text-xs text-gray-400">Last logged: {new Date(item.lastLogged).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${item.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                    {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amount)}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => logNow(item.id)} title="Log now">
                    <PlayCircle className="h-4 w-4 mr-1" /> Log Now
                  </Button>
                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Recurring Transaction">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedType === t
                    ? t === "INCOME" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select {...register("categoryId")} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600">Required</p>}
          </div>

          <Input label="Amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} error={errors.amount?.message} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Frequency</label>
            <select {...register("frequency")} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <Input label="Start Date" type="date" {...register("startDate")} />
          <Input label="Description (optional)" {...register("description")} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>Add Recurring</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
