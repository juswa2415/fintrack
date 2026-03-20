"use client";

import { useState } from "react";
import { Sidebar, MenuButton } from "@/components/layout/sidebar";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userImage?: string | null;
}

export function AppShell({ children, userName, userImage }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-full lg:ml-60">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MenuButton onClick={() => setSidebarOpen(true)} />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center ring-2 ring-indigo-100">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-semibold text-indigo-700">
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </span>
              )}
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
