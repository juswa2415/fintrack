"use client";

import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";

interface TopBarProps {
  householdName?: string;
}

export function TopBar({ householdName }: TopBarProps) {
  const { data: session } = useSession();

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
        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
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
