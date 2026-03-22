"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCurrency } from "@/lib/use-currency";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Search, X,
  ArrowUpRight, ArrowDownRight, SlidersHorizontal,
} from "lucide-react";

interface Category { id: string; name: string; type: string; color: string; }
interface Transaction {
  id: string; amount: number; type: string; date: string;
  description: string | null; notes: string | null; category: Category;
}

const schema = z.object({
  categoryId:  z.string().min(1, "Select a category"),
  amount:      z.number().positive("Amount must be positive"),
  type:        z.enum(["INCOME", "EXPENSE"]),
  date:        z.string(),
  description: z.string().optional(),
  notes:       z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const currency = useCurrency();
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editTx, setEditTx]               = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx]           = useState<Transaction | null>(null);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [showFilters, setShowFilters]     = useState(false);

  // Filters — type + category are sent to API; search + date range are client-side
  const [filterType, setFilterType]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch]               = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", date: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType)     params.set("type",       filterType);
    if (filterCategory) params.set("categoryId", filterCategory);
    // Server handles date range too — avoids pulling all records when filtering large sets
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo)   params.set("to",   dateTo);

    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/categories"),
    ]);
    setTransactions(await txRes.json());
    setCategories(await catRes.json());
    setLoading(false);
    setPage(1);
  }, [filterType, filterCategory, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side description search (fast, no round-trip)
  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.category.name.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome  = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  const hasFilters = filterType || filterCategory || dateFrom || dateTo || search;

  const clearFilters = () => {
    setFilterType(""); setFilterCategory(""); setDateFrom(""); setDateTo(""); setSearch("");
  };

  // ── Modal helpers ──
  const openAdd = () => {
    reset({ type: "EXPENSE", date: new Date().toISOString().split("T")[0] });
    setEditTx(null);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    reset({
      categoryId:  tx.category.id,
      amount:      tx.amount,
      type:        tx.type as "INCOME" | "EXPENSE",
      date:        new Date(tx.date).toISOString().split("T")[0],
      description: tx.description ?? "",
      notes:       tx.notes ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const url    = editTx ? `/api/transactions/${editTx.id}` : "/api/transactions";
    const method = editTx ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModalOpen(false);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTx) return;
    await fetch(`/api/transactions/${deleteTx.id}`, { method: "DELETE" });
    setDeleteTx(null);
    fetchData();
  };

  const filteredCats = categories.filter((c) => !selectedType || c.type === selectedType);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#141414] tracking-[-0.03em]">Transactions</h1>
          <p className="text-[13px] text-[#A8A49E] mt-0.5">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {hasFilters ? " (filtered)" : ""}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add transaction
        </Button>
      </div>

      {/* ── Summary strip ── */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
            <p className="text-[10px] font-medium text-[#A8A49E] uppercase tracking-widest mb-1.5">Income</p>
            <p className="text-[18px] font-semibold text-[#16A34A] tabular-nums tracking-tight">
              +{formatCurrency(totalIncome, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
            <p className="text-[10px] font-medium text-[#A8A49E] uppercase tracking-widest mb-1.5">Expenses</p>
            <p className="text-[18px] font-semibold text-[#141414] tabular-nums tracking-tight">
              -{formatCurrency(totalExpense, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
            <p className="text-[10px] font-medium text-[#A8A49E] uppercase tracking-widest mb-1.5">Net</p>
            <p className={`text-[18px] font-semibold tabular-nums tracking-tight ${totalIncome - totalExpense >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {totalIncome - totalExpense >= 0 ? "+" : ""}{formatCurrency(totalIncome - totalExpense, currency)}
            </p>
          </div>
        </div>
      )}

      {/* ── Search + filter bar ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A8A49E]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by description or category…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E6E4DF] bg-white text-[13px] text-[#141414] placeholder:text-[#A8A49E] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A49E] hover:text-[#141414]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Toggle filter panel */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition-colors ${
              showFilters || (filterType || filterCategory || dateFrom || dateTo)
                ? "border-[#141414] bg-[#141414] text-white"
                : "border-[#E6E4DF] bg-white text-[#6B6860] hover:bg-[#F4F3F0]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {(filterType || filterCategory || dateFrom || dateTo) && (
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-0.5" />
            )}
          </button>

          {hasFilters && (
            <button onClick={clearFilters} className="h-9 px-3 rounded-xl text-[12px] font-medium text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors border border-[#E6E4DF]">
              Clear
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E4DF]">
            {/* Type */}
            <div>
              <label className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1 block">Type</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="w-full h-8 px-2 rounded-lg border border-[#E6E4DF] bg-white text-[12px] text-[#141414] focus:outline-none"
              >
                <option value="">All</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1 block">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                className="w-full h-8 px-2 rounded-lg border border-[#E6E4DF] bg-white text-[12px] text-[#141414] focus:outline-none"
              >
                <option value="">All</option>
                {categories
                  .filter((c) => !filterType || c.type === filterType)
                  .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1 block">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full h-8 px-2 rounded-lg border border-[#E6E4DF] bg-white text-[12px] text-[#141414] focus:outline-none"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1 block">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full h-8 px-2 rounded-lg border border-[#E6E4DF] bg-white text-[12px] text-[#141414] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Transactions list ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <Search className="h-8 w-8 text-[#E6E4DF]" />
              <p className="text-[13px] font-medium text-[#6B6860]">No transactions found</p>
              <p className="text-[11px] text-[#A8A49E]">
                {hasFilters ? "Try adjusting your filters" : "Add your first transaction above"}
              </p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[140px_1fr_1fr_140px_64px] gap-3 px-4 py-2 border-b border-[#EEEDE9] bg-[#FAFAF8]">
                <span className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider">Date</span>
                <span className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider">Transaction</span>
                <span className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider">Notes</span>
                <span className="text-[10px] font-semibold text-[#A8A49E] uppercase tracking-wider text-right">Amount</span>
                <span />
              </div>

              <div>
                {paginated.map((tx, i) => (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-[140px_1fr_1fr_140px_64px] gap-3 items-center px-4 py-3 hover:bg-[#FAFAF8] transition-colors group ${i < paginated.length - 1 ? "border-b border-[#F4F3F0]" : ""}`}
                  >
                    {/* Date column */}
                    <div className="text-[12px] text-[#6B6860] tabular-nums">
                      {formatDate(tx.date)}
                    </div>

                    {/* Transaction: avatar + name + category badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: tx.category.color }}
                      >
                        {tx.category.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#141414] truncate">
                          {tx.description || tx.category.name}
                        </p>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: tx.category.color + "20", color: tx.category.color }}
                        >
                          {tx.category.name}
                        </span>
                      </div>
                    </div>

                    {/* Notes column */}
                    <div className="min-w-0">
                      {tx.notes ? (
                        <p className="text-[12px] text-[#6B6860] truncate" title={tx.notes}>
                          {tx.notes}
                        </p>
                      ) : (
                        <span className="text-[12px] text-[#D4D0CA]">—</span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-end gap-1 flex-shrink-0">
                      {tx.type === "INCOME"
                        ? <ArrowUpRight className="h-3 w-3 text-[#16A34A]" />
                        : <ArrowDownRight className="h-3 w-3 text-[#DC2626]" />}
                      <span className={`text-[13px] font-semibold tabular-nums ${tx.type === "INCOME" ? "text-[#16A34A]" : "text-[#141414]"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                      </span>
                    </div>

                    {/* Row actions */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTx(tx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#EEEDE9]">
                  <p className="text-[11px] text-[#A8A49E]">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      ←
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-medium transition-colors ${page === p ? "bg-[#141414] text-white" : "text-[#6B6860] hover:bg-[#F4F3F0]"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTx ? "Edit transaction" : "Add transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#E6E4DF]">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                  selectedType === t
                    ? t === "INCOME" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#141414] text-white"
                    : "bg-white text-[#6B6860] hover:bg-[#F4F3F0]"
                }`}
              >
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Category</label>
            <select {...register("categoryId")}
              className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-white text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
              <option value="">Select category</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-[11px] text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Amount</label>
            <Input type="number" step="0.01" placeholder="0.00"
              {...register("amount", { valueAsNumber: true })} />
            {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Date</label>
            <Input type="date" {...register("date")} />
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Description (optional)</label>
            <Input placeholder="e.g. Monthly salary" {...register("description")} />
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6860] mb-1.5 block">Notes (optional)</label>
            <Input placeholder="Additional notes" {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>
              {editTx ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirm modal ── */}
      <Modal open={!!deleteTx} onClose={() => setDeleteTx(null)} title="Delete transaction?">
        <p className="text-[13px] text-[#6B6860] mb-4">
          This will permanently remove{" "}
          <strong>{deleteTx?.description || deleteTx?.category.name}</strong> (
          {deleteTx && formatCurrency(deleteTx.amount, currency)}).
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTx(null)}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
