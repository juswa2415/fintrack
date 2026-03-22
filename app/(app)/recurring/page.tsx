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
import { formatCurrency } from "@/lib/utils";
import { getDueStatusFull, type DueStatus } from "@/lib/recurring";
import {
  Plus, Trash2, CheckCircle2, Clock, Pencil,
  AlertCircle, TrendingUp, TrendingDown,
} from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Recurring {
  id: string; amount: number; type: string; frequency: string;
  description: string | null; category: Category;
  lastLogged: string | null; startDate: string;
}
interface Toast { id: string; message: string; }
interface MissedPaymentInfo { item: Recurring; missedDates: string[]; selectedCount: number; }

const schema = z.object({
  categoryId: z.string().min(1, "Required"),
  amount: z.number().positive("Must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const FREQUENCIES = [
  { value: "DAILY",   label: "Daily" },
  { value: "WEEKLY",  label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY",  label: "Yearly" },
];

function getLoggedLabel(type: string) { return type === "INCOME" ? "Received ✓" : "Paid ✓"; }
function getActionLabel(type: string) { return type === "INCOME" ? "Record Income" : "Mark as Paid"; }

// Badge colours / icons
function statusBadge(status: DueStatus, type: string) {
  switch (status) {
    case "overdue":      return { icon: <AlertCircle className="h-3 w-3" />, label: "Overdue",       cls: "bg-red-50 text-red-600" };
    case "due-soon":     return { icon: <Clock className="h-3 w-3" />,       label: "Due soon",      cls: "bg-amber-50 text-amber-600" };
    case "logged-period": return { icon: <CheckCircle2 className="h-3 w-3" />, label: getLoggedLabel(type), cls: "bg-green-50 text-green-600" };
    default:             return { icon: <Clock className="h-3 w-3" />,       label: "Upcoming",      cls: "bg-[#F4F3F0] text-[#6B6860]" };
  }
}

// Single recurring item card — reused in both sections
function RecurringItem({
  item, currency, loggingId, onLog, onEdit, onDelete,
}: {
  item: Recurring;
  currency: string;
  loggingId: string | null;
  onLog: (item: Recurring) => void;
  onEdit: (item: Recurring) => void;
  onDelete: (item: Recurring) => void;
}) {
  const status = getDueStatusFull(item.frequency, item.lastLogged, item.startDate);
  const badge  = statusBadge(status, item.type);
  const isIncome = item.type === "INCOME";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF8] transition-colors group">
      {/* Color dot + icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
        style={{ backgroundColor: item.category.color }}
      >
        {item.category.name[0]}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-[#141414] truncate">
            {item.description || item.category.name}
          </p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
            {badge.icon}{badge.label}
          </span>
        </div>
        <p className="text-[11px] text-[#A8A49E] mt-0.5">
          {item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()} · {item.category.name}
        </p>
      </div>

      {/* Amount */}
      <p className={`text-[14px] font-semibold tabular-nums flex-shrink-0 ${isIncome ? "text-[#16A34A]" : "text-[#141414]"}`}>
        {isIncome ? "+" : "-"}{formatCurrency(item.amount, currency)}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {status !== "logged-period" && (
          <Button
            size="sm"
            variant={isIncome ? "outline" : "default"}
            loading={loggingId === item.id}
            onClick={() => onLog(item)}
            className="text-[11px]"
          >
            {getActionLabel(item.type)}
          </Button>
        )}
        <button
          onClick={() => onEdit(item)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const currency = useCurrency();
  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Recurring | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recurring | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [missedInfo, setMissedInfo] = useState<MissedPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", frequency: "MONTHLY", startDate: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");

  const addToast = (message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const fetchData = useCallback(async () => {
    const [rRes, cRes] = await Promise.all([fetch("/api/recurring"), fetch("/api/categories")]);
    setItems(await rRes.json());
    setCategories(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    reset({ type: "EXPENSE", frequency: "MONTHLY", startDate: new Date().toISOString().split("T")[0] });
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (item: Recurring) => {
    setEditItem(item);
    reset({
      categoryId:  item.category.id,
      amount:      item.amount,
      type:        item.type as "INCOME" | "EXPENSE",
      frequency:   item.frequency as FormData["frequency"],
      startDate:   item.startDate.split("T")[0],
      description: item.description ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const url    = editItem ? `/api/recurring/${editItem.id}` : "/api/recurring";
    const method = editItem ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModalOpen(false);
    reset();
    fetchData();
  };

  const handleLog = async (item: Recurring) => {
    setLoggingId(item.id);
    try {
      const res  = await fetch(`/api/recurring/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "log" }) });
      const data = await res.json();
      if (data.missedDates?.length) {
        setMissedInfo({ item, missedDates: data.missedDates, selectedCount: data.missedDates.length });
      } else {
        addToast(item.type === "INCOME" ? "Income recorded ✓" : "Marked as paid ✓");
        fetchData();
      }
    } finally {
      setLoggingId(null);
    }
  };

  const handleLogMissed = async () => {
    if (!missedInfo) return;
    await fetch(`/api/recurring/${missedInfo.item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logMissed", count: missedInfo.selectedCount }),
    });
    setMissedInfo(null);
    addToast(`Logged ${missedInfo.selectedCount} missed payment${missedInfo.selectedCount > 1 ? "s" : ""} ✓`);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/recurring/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchData();
  };

  const incomeItems  = items.filter((i) => i.type === "INCOME");
  const expenseItems = items.filter((i) => i.type === "EXPENSE");

  const sectionTotal = (list: Recurring[]) => list.reduce((s, i) => s + i.amount, 0);

  const filteredCategories = categories.filter((c) => c.type === selectedType || c.type === "INCOME");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-5 h-5 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">Recurring</h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">Manage scheduled income and expenses</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add recurring
        </Button>
      </div>

      {/* Two-column split: Income | Expense — stretch to fill page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* Income column */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEDE9]">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#16A34A]" />
                <p className="text-[13px] font-semibold text-[#141414]">Income</p>
                <span className="text-[10px] bg-[#F4F3F0] text-[#6B6860] px-1.5 py-0.5 rounded-full font-medium">
                  {incomeItems.length}
                </span>
              </div>
              <p className="text-[12px] font-semibold text-[#16A34A] tabular-nums">
                +{formatCurrency(sectionTotal(incomeItems), currency)}
              </p>
            </div>
            {incomeItems.length === 0 ? (
              <p className="text-[12px] text-[#A8A49E] text-center py-8">No recurring income yet</p>
            ) : (
              <div className="p-2">
                {incomeItems.map((item) => (
                  <RecurringItem
                    key={item.id} item={item} currency={currency}
                    loggingId={loggingId} onLog={handleLog} onEdit={openEdit} onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense column */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEDE9]">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#DC2626]" />
                <p className="text-[13px] font-semibold text-[#141414]">Expenses</p>
                <span className="text-[10px] bg-[#F4F3F0] text-[#6B6860] px-1.5 py-0.5 rounded-full font-medium">
                  {expenseItems.length}
                </span>
              </div>
              <p className="text-[12px] font-semibold text-[#DC2626] tabular-nums">
                -{formatCurrency(sectionTotal(expenseItems), currency)}
              </p>
            </div>
            {expenseItems.length === 0 ? (
              <p className="text-[12px] text-[#A8A49E] text-center py-8">No recurring expenses yet</p>
            ) : (
              <div className="p-2">
                {expenseItems.map((item) => (
                  <RecurringItem
                    key={item.id} item={item} currency={currency}
                    loggingId={loggingId} onLog={handleLog} onEdit={openEdit} onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edit recurring" : "Add recurring"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Type</label>
            <div className="flex rounded-xl overflow-hidden border border-[#E6E4DF]">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setValue("type", t)}
                  className={`flex-1 py-2 text-[13px] font-medium transition-colors ${selectedType === t ? (t === "INCOME" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#141414] text-white") : "bg-white text-[#6B6860] hover:bg-[#F4F3F0]"}`}>
                  {t === "INCOME" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Category</label>
            <select {...register("categoryId")}
              className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-white text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
              <option value="">Select category</option>
              {categories.filter((c) => c.type === selectedType).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-[11px] text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Amount</label>
            <Input
              type="number" step="0.01" placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Frequency */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Frequency</label>
            <select {...register("frequency")}
              className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-white text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Start date</label>
            <Input type="date" {...register("startDate")} />
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Description (optional)</label>
            <Input placeholder="e.g. Netflix, Electricity…" {...register("description")} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editItem ? "Save changes" : "Add recurring"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete recurring?">
        <p className="text-[13px] text-[#6B6860] mb-4">
          This will permanently remove <strong>{deleteTarget?.description || deleteTarget?.category.name}</strong> and all its logged transactions.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Missed payments dialog */}
      {missedInfo && (
        <Modal open onClose={() => setMissedInfo(null)} title="Missed payments detected">
          <p className="text-[13px] text-[#6B6860] mb-4">
            We found <strong>{missedInfo.missedDates.length}</strong> missed period{missedInfo.missedDates.length > 1 ? "s" : ""} for <strong>{missedInfo.item.description || missedInfo.item.category.name}</strong>. How many would you like to log?
          </p>
          <div className="flex items-center gap-3 mb-4">
            <Input
              type="number" min={1} max={missedInfo.missedDates.length}
              value={missedInfo.selectedCount}
              onChange={(e) => setMissedInfo((m) => m ? { ...m, selectedCount: Math.min(m.missedDates.length, Math.max(1, parseInt(e.target.value) || 1)) } : m)}
            />
            <span className="text-[12px] text-[#A8A49E] whitespace-nowrap">of {missedInfo.missedDates.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setMissedInfo(null); fetchData(); }}>
              Just log current
            </Button>
            <Button className="flex-1" onClick={handleLogMissed}>
              Log {missedInfo.selectedCount} payment{missedInfo.selectedCount > 1 ? "s" : ""}
            </Button>
          </div>
        </Modal>
      )}

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="bg-[#141414] text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
