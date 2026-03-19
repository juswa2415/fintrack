"use client";

import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface TopBarProps {
  householdName?: string;
}

interface Notification {
  id: string;
  type: "over_budget" | "upcoming_recurring";
  message: string;
  href: string;
}

export function TopBar({ householdName }: TopBarProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const monthStart = new Date(year, month - 1, 1).toISOString();
        const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

        const [budgetRes, txRes, recurringRes] = await Promise.all([
          fetch(`/api/budget?month=${month}&year=${year}`),
          fetch(`/api/transactions?type=EXPENSE&from=${monthStart}&to=${monthEnd}`),
          fetch("/api/recurring"),
        ]);

        const budgets = await budgetRes.json();
        const transactions = await txRes.json();
        const recurring = await recurringRes.json();

        const notes: Notification[] = [];

        // Over-budget alerts
        if (Array.isArray(budgets) && Array.isArray(transactions)) {
          const spendMap: Record<string, number> = {};
          for (const tx of transactions) {
            spendMap[tx.categoryId] = (spendMap[tx.categoryId] ?? 0) + tx.amount;
          }
          for (const b of budgets) {
            const spent = spendMap[b.categoryId] ?? 0;
            if (spent > b.amount) {
              notes.push({
                id: `budget-${b.id}`,
                type: "over_budget",
                message: `Over budget on ${b.category.name} (${((spent / b.amount) * 100).toFixed(0)}% used)`,
                href: "/budget",
              });
            } else if (spent / b.amount >= 0.8) {
              notes.push({
                id: `budget-warn-${b.id}`,
                type: "over_budget",
                message: `${b.category.name} is at ${((spent / b.amount) * 100).toFixed(0)}% of budget`,
                href: "/budget",
              });
            }
          }
        }

        // Recurring transactions not logged this month
        if (Array.isArray(recurring)) {
          for (const r of recurring) {
            const lastLogged = r.lastLogged ? new Date(r.lastLogged) : null;
            const alreadyThisMonth = lastLogged &&
              lastLogged.getMonth() + 1 === month &&
              lastLogged.getFullYear() === year;
            if (!alreadyThisMonth && r.frequency === "MONTHLY") {
              notes.push({
                id: `recurring-${r.id}`,
                type: "upcoming_recurring",
                message: `${r.description || r.category.name} hasn't been logged this month`,
                href: "/recurring",
              });
            }
          }
        }

        setNotifications(notes);
      } catch {
        // Silently fail — notifications are non-critical
      }
    }

    fetchNotifications();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const count = notifications.length;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="text-sm text-gray-500">
        {householdName && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            {householdName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  You&apos;re all caught up!
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === "over_budget" ? "bg-red-500" : "bg-amber-400"
                        }`} />
                        <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-700">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
        </div>
      </div>
    </header>
  );
}
