"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-medium text-[#6B6860] tracking-wide uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-xl border border-[#E6E4DF] bg-[#FAFAF8]",
            "px-3 text-[13px] text-[#141414] placeholder:text-[#A8A49E]",
            "focus:outline-none focus:ring-2 focus:ring-[#141414]/10 focus:border-[#141414]/30",
            "transition-all duration-150 disabled:opacity-50",
            error && "border-red-400 focus:ring-red-500/10 focus:border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
