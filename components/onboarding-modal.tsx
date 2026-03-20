"use client";

import { useState } from "react";
import {
  TrendingUp, ArrowLeftRight, Repeat, PiggyBank, Target, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: <TrendingUp className="h-10 w-10 text-indigo-600" />,
    title: "Welcome to FinTrack",
    description: "Your personal finance tracker. Track every peso you earn and spend, set savings goals, and understand where your money goes — all in one place.",
    color: "bg-indigo-50",
  },
  {
    icon: <ArrowLeftRight className="h-10 w-10 text-green-600" />,
    title: "Log Your Transactions",
    description: "Every time you earn or spend money, add it as a transaction. Choose a category (like Groceries, Salary, Transport), enter the amount, and FinTrack keeps your running balance updated automatically.",
    color: "bg-green-50",
  },
  {
    icon: <Repeat className="h-10 w-10 text-blue-600" />,
    title: "Recurring Transactions",
    description: "Got regular bills or income? Add them as recurring transactions — monthly electricity, weekly salary, yearly subscriptions. When the time comes, just click \"Mark as Paid\" and FinTrack logs it instantly.",
    color: "bg-blue-50",
  },
  {
    icon: <PiggyBank className="h-10 w-10 text-purple-600" />,
    title: "Set a Budget",
    description: "Set spending limits for each category every month. FinTrack shows you how much you've spent vs your budget so you stay in control and avoid overspending.",
    color: "bg-purple-50",
  },
  {
    icon: <Target className="h-10 w-10 text-orange-600" />,
    title: "Create Savings Goals",
    description: "Saving for a new phone, a trip, or an emergency fund? Create a goal, set a target amount and deadline, then contribute regularly. FinTrack tracks your progress automatically.",
    color: "bg-orange-50",
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-gray-400">
              {step + 1} of {steps.length}
            </span>
            <button
              onClick={handleComplete}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              Skip tour <X className="h-3 w-3" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 ${current.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            {current.icon}
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
            {current.title}
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            {current.description}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6 mb-8">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step ? "w-6 h-2 bg-indigo-600" : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button className="flex-1" loading={completing} onClick={handleComplete}>
                Get Started 🎉
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
}
