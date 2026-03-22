"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const variants = {
  default:     "bg-[#141414] text-white hover:bg-[#2a2a2a] active:bg-[#0a0a0a]",
  outline:     "border border-[#E6E4DF] bg-white text-[#141414] hover:bg-[#F4F3F0]",
  ghost:       "text-[#6B6860] hover:bg-[#F4F3F0] hover:text-[#141414]",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  secondary:   "bg-[#F4F3F0] text-[#141414] hover:bg-[#ECEAE5] border border-[#E6E4DF]",
};

const sizes = {
  default: "h-9 px-4 py-2 text-[13px]",
  sm:      "h-7 px-3 text-[12px]",
  lg:      "h-10 px-5 text-sm",
  icon:    "h-8 w-8",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141414]/20",
          "disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
          "tracking-[-0.01em]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
