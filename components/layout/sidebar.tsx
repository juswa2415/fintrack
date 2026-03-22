"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ArrowLeftRight, Repeat, PieChart,
  Target, FileText, Tag, User, LogOut, TrendingUp,
  X, Menu,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring",    label: "Recurring",    icon: Repeat },
  { href: "/budget",       label: "Budget",       icon: PieChart },
  { href: "/goals",        label: "Goals",        icon: Target },
  { href: "/reports",      label: "Reports",      icon: FileText },
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

function SidebarContent({ onClose, userName, userImage }: {
  onClose: () => void;
  userName?: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "none",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-5 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#141414] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-[#141414] tracking-[-0.02em]">FinTrack</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                !active && "hover:shadow-[0_1px_4px_0_rgba(0,0,0,0.10)] hover:bg-white/60"
              )}
              style={{
                background: active ? "var(--sidebar-active)" : undefined,
                color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                boxShadow: active ? "0 1px 4px 0 rgba(0,0,0,0.10)" : undefined,
              }}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: active ? "var(--sidebar-active-text)" : "var(--text-muted)" }}
              />
              {label}
            </Link>
          );
        })}

        {/* Settings divider */}
        <div className="pt-4 pb-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Settings
          </p>
        </div>

        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                !active && "hover:shadow-[0_1px_4px_0_rgba(0,0,0,0.10)] hover:bg-white/60"
              )}
              style={{
                background: active ? "var(--sidebar-active)" : undefined,
                color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                boxShadow: active ? "0 1px 4px 0 rgba(0,0,0,0.10)" : undefined,
              }}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: active ? "var(--sidebar-active-text)" : "var(--text-muted)" }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Ko-fi support link */}
      <div className="px-4 pb-3 flex-shrink-0">
        <a
          href="https://ko-fi.com/Y8Y61WGMQG"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl overflow-hidden transition-all duration-150 hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.12)] hover:opacity-90"
          title="Support this project on Ko-fi"
        >
          <img
            src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
            alt="Buy Me a Coffee at ko-fi.com"
            style={{ width: "75%", height: "auto", display: "block", border: "0px" }}
          />
        </a>
      </div>

      {/* User card */}
      <div className="px-3 pb-4 flex-shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl mt-3">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#E6E4DF]"
            style={{ minWidth: "2rem", minHeight: "2rem" }}
          >
            {userImage ? (
              <img
                src={userImage}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[12px] font-semibold text-[#6B6860]">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#141414] truncate">{userName}</p>
            <p className="text-[10px] text-[#A8A49E]">Personal</p>
          </div>
          {/* Sign out — no inline style so hover:text-red-600 can take effect */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 text-[#A8A49E] hover:bg-red-50 hover:text-red-600"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, userName, userImage }: SidebarProps) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname]);

  return (
    <>
      {/* Desktop: fixed, always visible */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-full w-56 z-40">
        <SidebarContent onClose={onClose} userName={userName} userImage={userImage} />
      </aside>

      {/* Mobile: overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 z-50 lg:hidden transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onClose} userName={userName} userImage={userImage} />
      </aside>
    </>
  );
}

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-xl transition-colors"
      style={{ color: "var(--text-muted)" }}
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}
