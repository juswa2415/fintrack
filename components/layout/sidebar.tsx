"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ArrowLeftRight, Repeat, PieChart,
  Target, FileText, Settings, LogOut, TrendingUp,
  User, Tag, X, Menu,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/transactions",  label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring",     label: "Recurring",    icon: Repeat },
  { href: "/budget",        label: "Budget",       icon: PieChart },
  { href: "/goals",         label: "Goals",        icon: Target },
  { href: "/reports",       label: "Reports",      icon: FileText },
];

const settingsItems = [
  { href: "/settings/categories", label: "Categories", icon: Tag },
  { href: "/settings/profile",    label: "Profile",    icon: User },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string | null;
}

function SidebarContent({
  onClose, userName, userImage,
}: {
  onClose: () => void;
  userName?: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{
        background: "linear-gradient(180deg, #0f1117 0%, #141720 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            }}
          >
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">FinTrack</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          Main
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              )}
              style={active ? {
                background: "linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.08) 100%)",
              } : {}}
            >
              {/* Left accent bar */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: "linear-gradient(180deg, #818cf8, #6366f1)" }}
                />
              )}
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: active ? "#818cf8" : undefined }}
              />
              {label}
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          Settings
        </p>
        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              )}
              style={active ? {
                background: "linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.08) 100%)",
              } : {}}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: "linear-gradient(180deg, #818cf8, #6366f1)" }}
                />
              )}
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: active ? "#818cf8" : undefined }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User card + sign out */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-indigo-800 flex items-center justify-center">
            {userImage ? (
              <img src={userImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs font-bold text-indigo-200">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-gray-200 truncate">{userName}</p>
            <p className="text-[10px] text-gray-600 truncate">Personal account</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, userName, userImage }: SidebarProps) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname]);

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-full w-60 z-40">
        <SidebarContent onClose={onClose} userName={userName} userImage={userImage} />
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-72 z-50 lg:hidden transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={onClose} userName={userName} userImage={userImage} />
      </aside>
    </>
  );
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
