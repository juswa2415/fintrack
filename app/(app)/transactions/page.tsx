"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Transaction {
  id: string; amount: number; type: string; date: string;
  description: string | null; category: Category;
}

const schema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function TransactionsPage() {
  const currency = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", date: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterCategory) params.set("categoryId", filterCategory);
    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/categories"),
    ]);
    setTransactions(await txRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }, [filterType, filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    reset({ type: "EXPENSE", date: new Date().toISOString().split("T")[0] });
    setEditTx(null);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    reset({
      categoryId: tx.category.id,
      amount: tx.amount,
      type: tx.type as "INCOME" | "EXPENSE",
      date: new Date(tx.date).toISOString().split("T")[0],
      description: tx.description ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const url = editTx ? `/api/transactions/${editTx.id}` : "/api/transactions";
    const method = editTx ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModalOpen(false);
    fetchData();
  };

  const deleteTx = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filteredCats = categories.filter((c) => !selectedType || c.type === selectedType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{transactions.length} records</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-gray-400">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Amount</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-6 py-3 text-gray-800 font-medium">{tx.description || "—"}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: tx.category.color + "20", color: tx.category.color }}>
                          {tx.category.name}
                        </span>
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${tx.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(tx)}
                            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteTx(tx.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedType === t
                    ? t === "INCOME" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select {...register("categoryId")}
              className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>

          <Input label="Amount" type="number" step="0.01" placeholder="0.00"
            {...register("amount", { valueAsNumber: true })} error={errors.amount?.message} />
          <Input label="Date" type="date" {...register("date")} error={errors.date?.message} />
          <Input label="Description (optional)" placeholder="e.g. Monthly salary" {...register("description")} />
          <Input label="Notes (optional)" placeholder="Additional notes" {...register("notes")} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editTx ? "Save Changes" : "Add Transaction"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
