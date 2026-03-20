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
import { Plus, Trash2, CheckCircle2, Clock, Pencil, AlertCircle } from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Recurring {
  id: string; amount: number; type: string; frequency: string;
  description: string | null; category: Category;
  lastLogged: string | null; startDate: string;
}
interface Toast { id: string; message: string; }
interface MissedPaymentInfo {
  item: Recurring;
  missedDates: string[];
  selectedCount: number;
}

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
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

function getDueStatus(item: Recurring): "overdue" | "due-soon" | "logged-period" | "upcoming" {
  const now = new Date();
  const lastLogged = item.lastLogged ? new Date(item.lastLogged) : null;
  const startDate = new Date(item.startDate);

  if (lastLogged) {
    const alreadyLogged = (() => {
      switch (item.frequency) {
        case "DAILY": return lastLogged.toDateString() === now.toDateString();
        case "WEEKLY": return Math.floor((now.getTime() - lastLogged.getTime()) / 86400000) < 7;
        case "MONTHLY": return lastLogged.getMonth() === now.getMonth() && lastLogged.getFullYear() === now.getFullYear();
        case "YEARLY": return lastLogged.getFullYear() === now.getFullYear();
        default: return false;
      }
    })();
    if (alreadyLogged) return "logged-period";
  }

  if (startDate > now) {
    const daysUntil = Math.floor((startDate.getTime() - now.getTime()) / 86400000);
    return daysUntil <= 3 ? "due-soon" : "upcoming";
  }

  if (!lastLogged) return "overdue";
  const periodDays = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, YEARLY: 365 }[item.frequency] ?? 30;
  const daysSince = Math.floor((now.getTime() - lastLogged.getTime()) / 86400000);
  if (daysSince >= periodDays) return "overdue";
  if (daysSince >= periodDays - 3) return "due-soon";
  return "upcoming";
}

// Label helpers based on type
function getLoggedLabel(type: string) {
  return type === "INCOME" ? "Received ✓" : "Paid ✓";
}
function getActionLabel(type: string) {
  return type === "INCOME" ? "Record Income" : "Mark as Paid";
}

export default function RecurringPage() {
  const currency = useCurrency();
  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Recurring | null>(null);
  const [originalStartDate, setOriginalStartDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<Recurring | null>(null);
  const [missedPayment, setMissedPayment] = useState<MissedPaymentInfo | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", frequency: "MONTHLY", startDate: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");
  const currentStartDate = watch("startDate");

  const fetchData = useCallback(async () => {
    const [r, c] = await Promise.all([fetch("/api/recurring"), fetch("/api/categories")]);
    setItems(await r.json());
    setCategories(await c.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addToast = (message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const doLog = async (item: Recurring, force = false, paymentDates?: string[]) => {
    setLoggingId(item.id);
    const body: any = { force };
    if (paymentDates) body.paymentDates = paymentDates;

    const res = await fetch(`/api/recurring/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 409) { setConfirmItem(item); setLoggingId(null); return; }
    if (res.status === 202) {
      const data = await res.json();
      setMissedPayment({ item, missedDates: data.missedDates, selectedCount: data.count });
      setLoggingId(null);
      return;
    }
    if (res.ok) {
      const count = paymentDates?.length ?? 1;
      const verb = item.type === "INCOME" ? "Income recorded" : "Payment recorded";
      addToast(`${verb} — ${count > 1 ? `${count} payments` : formatCurrency(item.amount, currency)} for ${item.description || item.category.name}`);
      fetchData();
    }
    setLoggingId(null);
  };

  const onSubmit = async (data: FormData) => {
    if (editItem) {
      // Check if startDate moved earlier — reset lastLogged if so
      const startDateChanged = data.startDate !== originalStartDate;
      const newStartEarlier = startDateChanged && new Date(data.startDate) < new Date(originalStartDate);

      await fetch(`/api/recurring/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          resetLastLogged: newStartEarlier, // tell API to reset payment history
        }),
      });
      setEditItem(null);
    } else {
      await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    reset();
    fetchData();
  };

  const openEdit = (item: Recurring) => {
    setEditItem(item);
    setOriginalStartDate(new Date(item.startDate).toISOString().split("T")[0]);
    setValue("categoryId", item.category.id);
    setValue("amount", item.amount);
    setValue("type", item.type as "INCOME" | "EXPENSE");
    setValue("frequency", item.frequency as any);
    setValue("startDate", new Date(item.startDate).toISOString().split("T")[0]);
    setValue("description", item.description ?? "");
    setModalOpen(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Remove this recurring transaction?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    fetchData();
  };

  const filteredCats = categories.filter((c) => !selectedType || c.type === selectedType);
  const dueItems = items.filter((i) => { const s = getDueStatus(i); return s === "overdue" || s === "due-soon"; });
  const startDateMovedEarlier = editItem && currentStartDate && new Date(currentStartDate) < new Date(originalStartDate);

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage automatic income and expenses</p>
        </div>
        <Button onClick={() => { setEditItem(null); reset(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Recurring
        </Button>
      </div>

      {dueItems.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {dueItems.length} transaction{dueItems.length > 1 ? "s" : ""} need{dueItems.length === 1 ? "s" : ""} to be logged
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {dueItems.map((i) => i.description || i.category.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : items.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-gray-400">No recurring transactions yet.</CardContent></Card>
        ) : (
          items.map((item) => {
            const status = getDueStatus(item);
            return (
              <Card key={item.id} className={status === "overdue" ? "border-red-200" : status === "due-soon" ? "border-amber-200" : ""}>
                <CardContent className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: item.category.color }}>
                      {item.category.name[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.description || item.category.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.category.name} · {item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {status === "logged-period" && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            {item.type === "INCOME" ? "Received" : "Paid"} {item.lastLogged ? new Date(item.lastLogged).toLocaleDateString() : ""}
                          </span>
                        )}
                        {status === "overdue" && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                        {status === "due-soon" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Clock className="h-3 w-3" /> Due soon
                          </span>
                        )}
                        {status === "upcoming" && item.lastLogged && (
                          <span className="text-xs text-gray-400">
                            Last: {new Date(item.lastLogged).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-base font-bold ${item.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amount, currency)}
                    </span>
                    <button
                      onClick={() => doLog(item)}
                      disabled={loggingId === item.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        status === "logged-period"
                          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          : status === "overdue"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : status === "due-soon"
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {status === "logged-period" ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> {getLoggedLabel(item.type)}</>
                      ) : getActionLabel(item.type)}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Double-log confirmation */}
      <Modal open={!!confirmItem} onClose={() => setConfirmItem(null)} title="Already logged this period">
        {confirmItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800 font-medium">
                You already {confirmItem.type === "INCOME" ? "recorded income" : "logged a payment"} for{" "}
                <span className="font-bold">{confirmItem.description || confirmItem.category.name}</span>{" "}
                on {confirmItem.lastLogged ? new Date(confirmItem.lastLogged).toLocaleDateString() : "a previous date"}.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Log another {confirmItem.type === "INCOME" ? "income entry" : "payment"}? Only do this for a genuine second transaction.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmItem(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1"
                onClick={() => { const i = confirmItem; setConfirmItem(null); doLog(i, true); }}>
                Log Again
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Missed payments modal */}
      <Modal open={!!missedPayment} onClose={() => setMissedPayment(null)} title="Missed Payments Detected">
        {missedPayment && (
          <MissedPaymentsModal
            info={missedPayment}
            currency={currency}
            onConfirm={(dates) => { const item = missedPayment.item; setMissedPayment(null); doLog(item, true, dates); }}
            onCancel={() => setMissedPayment(null)}
          />
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); reset(); }}
        title={editItem ? "Edit Recurring Transaction" : "Add Recurring Transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedType === t
                    ? t === "INCOME" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{t === "INCOME" ? "Income" : "Expense"}</button>
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
          <Input label="Amount" type="number" step="0.01"
            {...register("amount", { valueAsNumber: true })} error={errors.amount?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Frequency</label>
            <select {...register("frequency")}
              className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <Input label="Start Date" type="date" {...register("startDate")} />

          {/* Warn user if start date moved earlier */}
          {startDateMovedEarlier && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              ⚠️ You moved the start date earlier. Payment history will be reset so missed periods can be detected correctly.
            </div>
          )}

          <Input label="Description (optional)" placeholder="e.g. Monthly electricity bill" {...register("description")} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1"
              onClick={() => { setModalOpen(false); setEditItem(null); reset(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editItem ? "Save Changes" : "Add Recurring"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MissedPaymentsModal({
  info, currency, onConfirm, onCancel,
}: {
  info: MissedPaymentInfo;
  currency: string;
  onConfirm: (dates: string[]) => void;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(info.missedDates.length);
  const selectedDates = info.missedDates.slice(0, count);
  const total = info.item.amount * count;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-sm font-medium text-amber-800">
          <span className="font-bold">{info.item.description || info.item.category.name}</span> has{" "}
          {info.missedDates.length} missed {info.item.type === "INCOME" ? "income period" : "payment"}{info.missedDates.length > 1 ? "s" : ""}.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          {info.item.type === "INCOME" ? "Periods to record:" : "Payments to log:"}
        </label>
        <input type="number" min={1} max={info.missedDates.length} value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(info.missedDates.length, parseInt(e.target.value) || 1)))}
          className="w-20 h-9 rounded-lg border border-gray-300 px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <span className="text-xs text-gray-400">of {info.missedDates.length} max</span>
      </div>
      <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
        {selectedDates.map((d, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-gray-700">
              {new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className={`text-sm font-medium ${info.item.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
              {info.item.type === "INCOME" ? "+" : "-"}{formatCurrency(info.item.amount, currency)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-500">Total</span>
        <span className={`text-base font-bold ${info.item.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
          {info.item.type === "INCOME" ? "+" : "-"}{formatCurrency(total, currency)}
        </span>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onConfirm(selectedDates)}>
          {info.item.type === "INCOME" ? `Record ${count} Income Period${count > 1 ? "s" : ""}` : `Log ${count} Payment${count > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
