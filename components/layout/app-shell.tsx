"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar, MenuButton } from "@/components/layout/sidebar";
import { Bell, CheckCircle2, X, AlertCircle, Clock, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// ─── Notification bell (unchanged) ───────────────────────────────────────────

type NotificationSeverity = "high" | "medium" | "info";
type NotificationType =
  | "recurring_overdue" | "recurring_due_soon"
  | "budget_overspent" | "budget_near_limit"
  | "goal_deadline" | "goal_completed";

interface AppNotification {
  id: string; type: NotificationType; severity: NotificationSeverity;
  title: string; subtitle: string; href: string; color: string; initial: string;
}

function severityIcon(severity: NotificationSeverity, type: NotificationType) {
  if (type === "goal_completed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (severity === "high") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
}
function badgeStyle(severity: NotificationSeverity, type: NotificationType) {
  if (type === "goal_completed") return "bg-green-50 text-green-700";
  if (severity === "high") return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-600";
}
function badgeLabel(type: NotificationType, severity: NotificationSeverity) {
  const map: Record<NotificationType, string> = {
    recurring_overdue: "Overdue", recurring_due_soon: "Due soon",
    budget_overspent: "Over budget", budget_near_limit: "Near limit",
    goal_deadline: severity === "high" ? "Urgent" : "Deadline", goal_completed: "Done!",
  };
  return map[type];
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const fetch_ = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setNotifications(d); })
      .catch(() => {});
  };
  useEffect(() => { fetch_(); }, [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const highCount = notifications.filter((n) => n.severity === "high").length;
  const total = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-black/5 transition-colors">
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center ${highCount > 0 ? "bg-red-500" : "bg-amber-400"}`}>
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#E6E4DF] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.14)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEDE9]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#141414]">Notifications</span>
              {total > 0 && <span className="text-[10px] font-medium bg-[#F4F3F0] text-[#6B6860] px-1.5 py-0.5 rounded-full">{total}</span>}
            </div>
            <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {total === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <CheckCircle2 className="h-7 w-7 text-[#A8A49E]" />
                <p className="text-[12px] font-medium text-[#6B6860]">All caught up</p>
                <p className="text-[11px] text-[#A8A49E] text-center px-4">No pending alerts</p>
              </div>
            ) : notifications.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#F4F3F0] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: n.color }}>
                  {n.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    {severityIcon(n.severity, n.type)}
                    <p className="text-[12px] font-medium text-[#141414] truncate">{n.title}</p>
                  </div>
                  <p className="text-[11px] text-[#A8A49E] truncate">{n.subtitle}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeStyle(n.severity, n.type)}`}>
                  {badgeLabel(n.type, n.severity)}
                </span>
              </Link>
            ))}
          </div>
          {total > 0 && (
            <div className="px-4 py-2 bg-[#FAFAF8] border-t border-[#EEEDE9]">
              <p className="text-[10px] text-[#A8A49E]">Tap any item to navigate</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick Add Transaction ────────────────────────────────────────────────────

const quickAddSchema = z.object({
  categoryId:  z.string().min(1, "Pick a category"),
  amount:      z.number().positive("Enter an amount"),
  type:        z.enum(["INCOME", "EXPENSE"]),
  date:        z.string(),
  description: z.string().optional(),
});
type QuickAddData = z.infer<typeof quickAddSchema>;

interface Category { id: string; name: string; type: string; color: string; }

function QuickAddButton() {
  const [open, setOpen]           = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [success, setSuccess]     = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<QuickAddData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { type: "EXPENSE", date: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");

  // Load categories when panel opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d); })
      .catch(() => {});
  }, [open]);

  const openPanel = () => {
    reset({ type: "EXPENSE", date: new Date().toISOString().split("T")[0] });
    setSuccess(false);
    setOpen(true);
  };

  const onSubmit = async (data: QuickAddData) => {
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSuccess(true);
    // Brief success flash, then close and refresh
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      router.refresh();
    }, 900);
  };

  const filteredCats = categories.filter((c) => c.type === selectedType);

  if (!open || typeof document === "undefined") {
    return (
      <button
        onClick={openPanel}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-black/5 transition-colors"
        title="Quick add transaction"
      >
        <Plus className="h-4 w-4" />
      </button>
    );
  }

  const panel = (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} className="flex items-start justify-end p-4 pt-16">
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.30)" }} onClick={() => setOpen(false)} />

      {/* Slide-in panel — anchored to top-right, below the header */}
      <div
        className="relative bg-white rounded-2xl border border-[#E6E4DF] w-full max-w-sm flex flex-col"
        style={{ boxShadow: "0 24px_64px_-12px rgba(0,0,0,0.22)", zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEDE9]">
          <div>
            <h2 className="text-[14px] font-semibold text-[#141414] tracking-[-0.01em]">Quick add</h2>
            <p className="text-[11px] text-[#A8A49E] mt-0.5">Log a transaction from anywhere</p>
          </div>
          <button onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
            </div>
            <p className="text-[13px] font-semibold text-[#141414]">Transaction saved!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">

            {/* Type toggle */}
            <div className="flex rounded-xl overflow-hidden border border-[#E6E4DF]">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => { setValue("type", t); setValue("categoryId", ""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors ${
                    selectedType === t
                      ? t === "INCOME" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#141414] text-white"
                      : "bg-white text-[#6B6860] hover:bg-[#F4F3F0]"
                  }`}>
                  {t === "INCOME"
                    ? <ArrowUpRight className="h-3.5 w-3.5" />
                    : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {t === "INCOME" ? "Income" : "Expense"}
                </button>
              ))}
            </div>

            {/* Amount — prominent, first field */}
            <div>
              <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1.5 block">Amount</label>
              <input
                type="number" step="0.01" placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className="w-full h-11 px-4 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] text-[18px] font-semibold text-[#141414] tabular-nums placeholder:text-[#D4D0CA] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
              {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1.5 block">Category</label>
              <select {...register("categoryId")}
                className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10">
                <option value="">Select category</option>
                {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-[11px] text-red-500 mt-1">{errors.categoryId.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1.5 block">Description (optional)</label>
              <input
                type="text" placeholder="e.g. Mcdo, Grab, Salary…"
                {...register("description")}
                className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] text-[13px] text-[#141414] placeholder:text-[#A8A49E] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-semibold text-[#A8A49E] uppercase tracking-wider mb-1.5 block">Date</label>
              <input
                type="date"
                {...register("date")}
                className="w-full h-9 px-3 rounded-xl border border-[#E6E4DF] bg-[#FAFAF8] text-[13px] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-[#141414] text-white text-[13px] font-semibold hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save transaction
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={openPanel}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[#141414] bg-black/5 transition-colors"
        title="Quick add transaction"
      >
        <Plus className="h-4 w-4" />
      </button>
      {createPortal(panel, document.body)}
    </>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userImage?: string | null;
}

export function AppShell({ children, userName, userImage }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={userName} userImage={userImage} />

      <div className="flex-1 flex flex-col min-h-full lg:pl-56">
        <div
          className="flex-1 flex flex-col m-3 lg:m-4 rounded-2xl overflow-hidden"
          style={{ background: "var(--content-bg)", boxShadow: "var(--content-shadow)" }}
        >
          <header
            className="h-14 flex items-center justify-between px-4 lg:px-5 flex-shrink-0"
            style={{ background: "var(--content-bg)", borderBottom: "1px solid var(--border-2)" }}
          >
            {/* Left slot */}
            <div className="flex items-center">
              <MenuButton onClick={() => setSidebarOpen(true)} />
              <div className="hidden lg:block w-0" aria-hidden />
            </div>

            {/* Right slot */}
            <div className="flex items-center gap-2">
              <QuickAddButton />
              <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
              <NotificationBell />
              <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "var(--border)" }}>
                  {userImage ? (
                    <img src={userImage} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {userName?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{userName}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
