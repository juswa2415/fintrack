"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Trash2 } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; icon: string; isDefault: boolean; }

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().default("#6366f1"),
});
type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", color: "#6366f1" },
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: FormData) => {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModalOpen(false);
    reset();
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error);
      return;
    }
    fetchData();
  };

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage income and expense categories</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Category
        </Button>
      </div>

      {[{ label: "Income", items: income }, { label: "Expense", items: expense }].map(({ label, items }) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle>{label} Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: c.color + "30" }}>
                      <span className="w-full h-full flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      </span>
                    </span>
                    <span className="text-sm font-medium text-gray-800">{c.name}</span>
                    {c.isDefault && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  {!c.isDefault && (
                    <button onClick={() => deleteCategory(c.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Category">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Freelance Income" {...register("name")} error={errors.name?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select {...register("type")} className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <input type="color" {...register("color")} className="h-9 w-full rounded-lg border border-gray-300 px-1 cursor-pointer" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>Add Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
