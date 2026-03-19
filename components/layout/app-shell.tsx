"use client";

import { useState } from "react";
import { Sidebar, MenuButton } from "@/components/layout/sidebar";

interface AppShellProps {
  children: React.ReactNode;
  householdName: string;
  userName: string;
}

export function AppShell({ children, householdName, userName }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset on desktop, full width on mobile */}
      <div className="flex-1 flex flex-col min-h-full lg:ml-60">
        {/* TopBar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MenuButton onClick={() => setSidebarOpen(true)} />
            {householdName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {householdName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-indigo-700">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{userName}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
