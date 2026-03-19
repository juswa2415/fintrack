"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  PieChart,
  Target,
  FileText,
  Settings,
  LogOut,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/budget", label: "Budget", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Reports", icon: FileText },
];

const settingsItems = [
  { href: "/settings/household", label: "Household", icon: Settings },
  { href: "/settings/categories", label: "Categories", icon: ChevronRight },
  { href: "/settings/profile", label: "Profile", icon: ChevronRight },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-900 text-white flex flex-col z-40">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white">FinTrack</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        <p className="px-3 mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</p>
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
