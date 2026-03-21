"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface Category {
  id: string; name: string; type: string;
  color: string; icon: string; isDefault: boolean;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#3b82f6", "#64748b",
];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

function CategoryCard({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  return (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
    >
      {/* Color dot */}
      <div
        className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: category.color }}
      >
        {category.name[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{category.name}</p>
        {category.isDefault && (
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Default</p>
        )}
      </div>

      {!category.isDefault && (
        <button
          onClick={() => onDelete(category.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [deleteError, setDeleteError] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", color: PRESET_COLORS[0] },
  });
  const selectedType = watch("type");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: FormData) => {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, color: selectedColor }),
    });
    setModalOpen(false);
    reset();
    setSelectedColor(PRESET_COLORS[0]);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    setDeleteError("");
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setDeleteError(json.error);
      return;
    }
    fetchData();
  };

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  const openAdd = (type?: "INCOME" | "EXPENSE") => {
    reset({ type: type ?? "EXPENSE", color: PRESET_COLORS[0] });
    setSelectedColor(PRESET_COLORS[0]);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} categories · {income.length} income · {expense.length} expense
          </p>
        </div>
        <Button onClick={() => openAdd()}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Category
        </Button>
      </div>

      {deleteError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {deleteError}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Income */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Income</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{income.length}</span>
            </div>
            <button
              onClick={() => openAdd("INCOME")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {income.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No income categories yet
              </div>
            ) : (
              income.map((c) => (
                <CategoryCard key={c.id} category={c} onDelete={deleteCategory} />
              ))
            )}
          </div>
        </div>

        {/* Expense */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Expense</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{expense.length}</span>
            </div>
            <button
              onClick={() => openAdd("EXPENSE")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {expense.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No expense categories yet
              </div>
            ) : (
              expense.map((c) => (
                <CategoryCard key={c.id} category={c} onDelete={deleteCategory} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Category">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Type toggle */}
          <div className="flex gap-2">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedType === t
                    ? t === "INCOME"
                      ? "bg-green-600 text-white border-green-600 shadow-sm"
                      : "bg-red-500 text-white border-red-500 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          <Input
            label="Category Name"
            placeholder="e.g. Freelance, Groceries"
            {...register("name")}
            error={errors.name?.message}
          />

          {/* Color picker — preset swatches + custom */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => { setSelectedColor(color); setValue("color", color); }}
                  className="w-8 h-8 rounded-xl transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: color,
                    boxShadow: selectedColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                    transform: selectedColor === color ? "scale(1.15)" : undefined,
                  }}
                />
              ))}
              {/* Custom color input */}
              <label className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden relative">
                <span className="text-gray-400 text-xs">+</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => { setSelectedColor(e.target.value); setValue("color", e.target.value); }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: selectedColor }}
              >
                A
              </div>
              <span className="text-xs text-gray-500">Preview</span>
              <span className="text-xs font-mono text-gray-400 ml-auto">{selectedColor}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              Add Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
