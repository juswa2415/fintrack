"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center p-4"
    >
      {/* Full-viewport backdrop — sits behind panel */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)" }}
        onClick={onClose}
      />

      {/* Panel — above backdrop via z-index:1 inside the stacking context */}
      <div
        className={cn(
          "relative bg-white rounded-2xl w-full max-w-md",
          "border border-[#E6E4DF]",
          "shadow-[0_32px_80px_-16px_rgba(0,0,0,0.28)]",
          "flex flex-col",
          className
        )}
        style={{ maxHeight: "90vh", zIndex: 1 }}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEDE9] flex-shrink-0">
          <h2 className="text-[14px] font-semibold text-[#141414] tracking-[-0.01em]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A49E] hover:text-[#141414] hover:bg-[#F4F3F0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
