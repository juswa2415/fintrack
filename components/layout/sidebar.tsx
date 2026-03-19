"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
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
  X,
  Menu,
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
  { href: "/settings/categories", label: "Categories", icon: Settings },
  { href: "/settings/profile", label: "Profile", icon: ChevronRight },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">FinTrack</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
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
            onClick={onClose}
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
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname]);

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-full w-60 z-40">
        <SidebarContent onClose={onClose} />
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-72 z-50 lg:hidden transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
