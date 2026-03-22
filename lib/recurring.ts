/**
 * lib/recurring.ts
 * Shared utilities for recurring transaction due-status logic.
 * Previously duplicated in app/(app)/recurring/page.tsx and app/api/notifications/route.ts
 */

export type DueStatus = "overdue" | "due-soon" | "logged-period" | "upcoming";

/** Full status used in the UI (recurring page). */
export function getDueStatusFull(
  frequency: string,
  lastLogged: Date | string | null,
  startDate: Date | string
): DueStatus {
  const now = new Date();
  const start = new Date(startDate);
  const last = lastLogged ? new Date(lastLogged) : null;

  if (last) {
    const alreadyLogged = (() => {
      switch (frequency) {
        case "DAILY":   return last.toDateString() === now.toDateString();
        case "WEEKLY":  return Math.floor((now.getTime() - last.getTime()) / 86_400_000) < 7;
        case "MONTHLY": return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
        case "YEARLY":  return last.getFullYear() === now.getFullYear();
        default:        return false;
      }
    })();
    if (alreadyLogged) return "logged-period";
  }

  if (start > now) {
    const daysUntil = Math.floor((start.getTime() - now.getTime()) / 86_400_000);
    return daysUntil <= 3 ? "due-soon" : "upcoming";
  }

  if (!last) return "overdue";

  const periodDays = ({ DAILY: 1, WEEKLY: 7, MONTHLY: 30, YEARLY: 365 } as Record<string, number>)[frequency] ?? 30;
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
  if (daysSince >= periodDays) return "overdue";
  if (daysSince >= periodDays - 3) return "due-soon";
  return "upcoming";
}

/**
 * Simplified status used by the notifications API.
 * Returns null when the item has already been logged for the current period.
 */
export function getDueStatusForNotification(
  frequency: string,
  lastLogged: Date | string | null,
  startDate: Date | string
): "overdue" | "due-soon" | null {
  const status = getDueStatusFull(frequency, lastLogged, startDate);
  if (status === "logged-period" || status === "upcoming") return null;
  return status;
}
