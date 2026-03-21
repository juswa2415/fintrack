"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar, MenuButton } from "@/components/layout/sidebar";
import { Bell, CheckCircle2, X, AlertCircle, Clock, TrendingDown, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NotificationSeverity = "high" | "medium" | "info";
type NotificationType =
  | "recurring_overdue" | "recurring_due_soon"
  | "budget_overspent" | "budget_near_limit"
  | "goal_deadline" | "goal_completed";

interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  subtitle: string;
  href: string;
  color: string;
  initial: string;
}

function severityIcon(severity: NotificationSeverity, type: NotificationType) {
  if (type === "goal_completed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (severity === "high") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
}

function severityBadge(severity: NotificationSeverity, type: NotificationType) {
  if (type === "goal_completed") return "bg-green-100 text-green-700";
  if (type.startsWith("budget")) return severity === "high" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600";
  if (type.startsWith("goal")) return "bg-amber-100 text-amber-600";
  return severity === "high" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600";
}

function severityLabel(type: NotificationType, severity: NotificationSeverity) {
  if (type === "recurring_overdue") return "Overdue";
  if (type === "recurring_due_soon") return "Due soon";
  if (type === "budget_overspent") return "Over budget";
  if (type === "budget_near_limit") return "Near limit";
  if (type === "goal_deadline") return severity === "high" ? "Urgent" : "Deadline";
  if (type === "goal_completed") return "Achieved!";
  return "Alert";
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const fetchNotifications = () => {
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotifications(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Refresh on route change so counts stay accurate
  useEffect(() => { fetchNotifications(); }, [pathname]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const highCount = notifications.filter((n) => n.severity === "high").length;
  const totalCount = notifications.length;

  // Group by source for the header
  const recurringCount = notifications.filter((n) => n.type.startsWith("recurring")).length;
  const budgetCount = notifications.filter((n) => n.type.startsWith("budget")).length;
  const goalCount = notifications.filter((n) => n.type.startsWith("goal")).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className={`absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${highCount > 0 ? "bg-red-500" : "bg-amber-400"}`}>
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          style={{ width: "340px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {totalCount > 0 && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${highCount > 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                  {totalCount}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Summary pills */}
          {totalCount > 0 && (
            <div className="flex gap-2 px-4 py-2 border-b border-gray-50 bg-gray-50/50">
              {recurringCount > 0 && (
                <span className="text-[10px] font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {recurringCount} recurring
                </span>
              )}
              {budgetCount > 0 && (
                <span className="text-[10px] font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  {budgetCount} budget
                </span>
              )}
              {goalCount > 0 && (
                <span className="text-[10px] font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                  {goalCount} goal{goalCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCircle2 className="h-9 w-9 text-green-400" />
                <p className="text-sm font-medium text-gray-600">All caught up!</p>
                <p className="text-xs text-gray-400 text-center px-6">No pending transactions, budget alerts, or goal deadlines</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  {/* Category initial */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: n.color }}
                  >
                    {n.initial}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {severityIcon(n.severity, n.type)}
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{n.subtitle}</p>
                  </div>

                  {/* Badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${severityBadge(n.severity, n.type)}`}>
                    {severityLabel(n.type, n.severity)}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Tap any item to go to that page</p>
              <p className="text-[10px] font-medium text-gray-500">{totalCount} alert{totalCount > 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userImage?: string | null;
}

export function AppShell({ children, userName, userImage }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userImage={userImage}
      />

      <div className="flex-1 flex flex-col min-h-full lg:ml-60">
        <header
          className="h-14 bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
          style={{ borderBottom: "1px solid #f0f1f5", boxShadow: "0 1px 0 0 #f0f1f5" }}
        >
          <div className="flex items-center gap-3">
            <MenuButton onClick={() => setSidebarOpen(true)} />
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)" }}
              >
                {userImage ? (
                  <img src={userImage} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-bold text-indigo-700">{userName?.[0]?.toUpperCase() ?? "U"}</span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{userName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
