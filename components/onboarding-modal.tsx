"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp, ArrowLeftRight, Repeat, PiggyBank, Target, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: <TrendingUp className="h-10 w-10 text-[#141414]" />,
    title: "Welcome to FinTrack",
    description: "Your personal finance tracker. Track every peso you earn and spend, set savings goals, and understand where your money goes — all in one place.",
    bg: "bg-[#F4F3F0]",
  },
  {
    icon: <ArrowLeftRight className="h-10 w-10 text-[#16A34A]" />,
    title: "Log Your Transactions",
    description: "Every time you earn or spend money, add it as a transaction. Choose a category, enter the amount, and FinTrack keeps your running balance updated automatically.",
    bg: "bg-[#DCFCE7]",
  },
  {
    icon: <Repeat className="h-10 w-10 text-[#4F46E5]" />,
    title: "Recurring Transactions",
    description: "Got regular bills or income? Add them as recurring transactions — monthly electricity, weekly salary, yearly subscriptions. Just click \"Mark as Paid\" when the time comes.",
    bg: "bg-[#EEF2FF]",
  },
  {
    icon: <PiggyBank className="h-10 w-10 text-[#D97706]" />,
    title: "Set a Budget",
    description: "Set spending limits for each category every month. FinTrack shows you how much you've spent vs your budget so you stay in control and avoid overspending.",
    bg: "bg-[#FEF3C7]",
  },
  {
    icon: <Target className="h-10 w-10 text-[#DC2626]" />,
    title: "Create Savings Goals",
    description: "Saving for a new phone, a trip, or an emergency fund? Create a goal, set a target amount and deadline, then contribute regularly. FinTrack tracks your progress.",
    bg: "bg-[#FEE2E2]",
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isLast  = step === steps.length - 1;
  const current = steps[step];

  const handleComplete = async () => {
    setCompleting(true);
    try { await fetch("/api/onboarding", { method: "POST" }); } catch {}
    onComplete();
  };

  if (!mounted || typeof document === "undefined") return null;

  const modal = (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} className="flex items-center justify-center p-4">
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)" }} onClick={handleComplete} />

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: "0 32px_80px_-16px rgba(0,0,0,0.28)", zIndex: 1 }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-[#F4F3F0]">
          <div
            className="h-full bg-[#141414] transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-7">
          {/* Step indicator + skip */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[11px] font-medium text-[#A8A49E]">{step + 1} of {steps.length}</span>
            <button
              onClick={handleComplete}
              className="flex items-center gap-1 text-[11px] text-[#A8A49E] hover:text-[#141414] transition-colors"
            >
              Skip tour <X className="h-3 w-3" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-18 h-18 w-[72px] h-[72px] ${current.bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            {current.icon}
          </div>

          {/* Content */}
          <h2 className="text-[18px] font-semibold text-[#141414] text-center mb-2 tracking-[-0.02em]">
            {current.title}
          </h2>
          <p className="text-[13px] text-[#6B6860] text-center leading-relaxed">
            {current.description}
          </p>

          {/* Dot navigation */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "20px" : "6px",
                  height: "6px",
                  background: i === step ? "#141414" : "#E6E4DF",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button className="flex-1" loading={completing} onClick={handleComplete}>
                Get started 🎉
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
