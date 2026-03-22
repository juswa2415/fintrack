export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { getDueStatusForNotification } from "@/lib/recurring";

export type NotificationType =
  | "recurring_overdue"
  | "recurring_due_soon"
  | "budget_overspent"
  | "budget_near_limit"
  | "goal_deadline"
  | "goal_completed";

export type NotificationSeverity = "high" | "medium" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  subtitle: string;
  href: string;
  color: string;
  initial: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [recurring, budgets, goals, monthlySpend, userRecord] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where: { userId: session.user.id, isActive: true },
        include: { category: true },
      }),
      prisma.budget.findMany({
        where: { userId: session.user.id, month: now.getMonth() + 1, year: now.getFullYear() },
        include: { category: true },
      }),
      prisma.goal.findMany({
        where: { userId: session.user.id },
        include: { category: true },
      }),
      // No take limit here — we need ALL categories for correct budget notifications
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId: session.user.id, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { currency: true },
      }),
    ]);

    const currency = userRecord?.currency ?? "USD";
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

    const notifications: AppNotification[] = [];
    const spendByCat = Object.fromEntries(monthlySpend.map((s) => [s.categoryId, s._sum.amount ?? 0]));

    // --- Recurring notifications ---
    for (const r of recurring) {
      const status = getDueStatusForNotification(r.frequency, r.lastLogged, r.startDate);
      if (!status) continue;
      const label = r.description || r.category.name;
      if (status === "overdue") {
        notifications.push({
          id: `recurring-overdue-${r.id}`,
          type: "recurring_overdue",
          severity: "high",
          title: `${label} is overdue`,
          subtitle: `${r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()} · ${r.type === "INCOME" ? "Income" : "Expense"}`,
          href: "/recurring",
          color: r.category.color,
          initial: r.category.name[0],
        });
      } else {
        notifications.push({
          id: `recurring-due-${r.id}`,
          type: "recurring_due_soon",
          severity: "medium",
          title: `${label} is due soon`,
          subtitle: `${r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()} · ${r.type === "INCOME" ? "Income" : "Expense"}`,
          href: "/recurring",
          color: r.category.color,
          initial: r.category.name[0],
        });
      }
    }

    // --- Budget notifications ---
    for (const b of budgets) {
      const spent = spendByCat[b.categoryId] ?? 0;
      const pct   = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      if (pct > 100) {
        notifications.push({
          id: `budget-over-${b.id}`,
          type: "budget_overspent",
          severity: "high",
          title: `${b.category.name} budget exceeded`,
          subtitle: `Overspent by ${fmt(spent - b.amount)} this month`,
          href: "/budget",
          color: b.category.color,
          initial: b.category.name[0],
        });
      } else if (pct >= 80) {
        notifications.push({
          id: `budget-near-${b.id}`,
          type: "budget_near_limit",
          severity: "medium",
          title: `${b.category.name} budget at ${Math.round(pct)}%`,
          subtitle: `${fmt(b.amount - spent)} remaining this month`,
          href: "/budget",
          color: b.category.color,
          initial: b.category.name[0],
        });
      }
    }

    // --- Goal notifications ---
    for (const g of goals) {
      if (g.isCompleted) {
        const completedRecently =
          g.updatedAt && now.getTime() - new Date(g.updatedAt).getTime() < 7 * 86_400_000;
        if (completedRecently) {
          notifications.push({
            id: `goal-done-${g.id}`,
            type: "goal_completed",
            severity: "info",
            title: `🎉 Goal achieved: ${g.name}`,
            subtitle: `You reached your target!`,
            href: "/goals",
            color: "#22c55e",
            initial: g.name[0],
          });
        }
        continue;
      }
      if (g.deadline) {
        const daysLeft = Math.floor((new Date(g.deadline).getTime() - now.getTime()) / 86_400_000);
        if (daysLeft >= 0 && daysLeft <= 7) {
          const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
          notifications.push({
            id: `goal-deadline-${g.id}`,
            type: "goal_deadline",
            severity: daysLeft <= 2 ? "high" : "medium",
            title: `${g.name} deadline ${daysLeft === 0 ? "is today" : `in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`}`,
            subtitle: `${pct}% complete — ${fmt(g.targetAmount - g.currentAmount)} remaining`,
            href: "/goals",
            color: "#f59e0b",
            initial: g.name[0],
          });
        }
      }
    }

    const order: Record<NotificationSeverity, number> = { high: 0, medium: 1, info: 2 };
    notifications.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json(notifications);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
