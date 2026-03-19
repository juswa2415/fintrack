"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users } from "lucide-react";

// Schema for creating a NEW household (no invite)
const newHouseholdSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  householdName: z.string().min(2, "Household name must be at least 2 characters"),
  currency: z.string().min(1),
});

// Schema for joining via invite (no household fields needed)
const joinSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type NewHouseholdData = z.infer<typeof newHouseholdSchema>;
type JoinData = z.infer<typeof joinSchema>;

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [error, setError] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ householdName: string; senderName: string } | null>(null);
  const [inviteError, setInviteError] = useState("");

  // Fetch invite info if token present
  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invite/info?token=${inviteToken}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setInviteError(json.error);
        else setInviteInfo(json);
      })
      .catch(() => setInviteError("Could not load invite details"));
  }, [inviteToken]);

  // New household form
  const newForm = useForm<NewHouseholdData>({
    resolver: zodResolver(newHouseholdSchema),
    defaultValues: { currency: "USD" },
  });

  // Join via invite form
  const joinForm = useForm<JoinData>({
    resolver: zodResolver(joinSchema),
  });

  const onSubmitNew = async (data: NewHouseholdData) => {
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Registration failed"); return; }

    await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    router.push("/dashboard");
  };

  const onSubmitJoin = async (data: JoinData) => {
    setError("");

    // Step 1: Create account (no household)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, inviteToken }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Registration failed"); return; }

    // Step 2: Sign in
    const signInRes = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (signInRes?.error) { setError("Account created but sign-in failed. Please log in manually."); return; }

    // Step 3: Accept invite
    const acceptRes = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: inviteToken, userId: json.userId }),
    });
    if (!acceptRes.ok) {
      router.push("/dashboard"); // Still go to dashboard, invite acceptance is secondary
      return;
    }

    router.push("/dashboard");
  };

  // Show invite error state
  if (inviteToken && inviteError) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-sm text-gray-500 mb-4">{inviteError}</p>
          <Link href="/register" className="text-indigo-600 hover:underline text-sm">
            Create your own account instead
          </Link>
        </div>
      </div>
    );
  }

  // Invite flow — join existing household
  if (inviteToken) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited!</h1>
          {inviteInfo ? (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{inviteInfo.senderName}</span> invited you to join{" "}
              <span className="font-medium text-gray-700">{inviteInfo.householdName}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Create an account to join the household</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={joinForm.handleSubmit(onSubmitJoin)} className="space-y-4">
            <Input label="Your Name" placeholder="John Smith"
              {...joinForm.register("name")} error={joinForm.formState.errors.name?.message} />
            <Input label="Email" type="email" placeholder="you@example.com"
              {...joinForm.register("email")} error={joinForm.formState.errors.email?.message} />
            <Input label="Password" type="password" placeholder="••••••••"
              {...joinForm.register("password")} error={joinForm.formState.errors.password?.message} />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" className="w-full" loading={joinForm.formState.isSubmitting}>
              Create Account & Join
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href={`/login?invite=${inviteToken}`} className="text-indigo-600 hover:underline font-medium">
            Sign in instead
          </Link>
        </p>
      </div>
    );
  }

  // Normal registration — create new household
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start tracking your family&apos;s finances</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={newForm.handleSubmit(onSubmitNew)} className="space-y-4">
          <Input label="Your Name" placeholder="John Smith"
            {...newForm.register("name")} error={newForm.formState.errors.name?.message} />
          <Input label="Email" type="email" placeholder="you@example.com"
            {...newForm.register("email")} error={newForm.formState.errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••"
            {...newForm.register("password")} error={newForm.formState.errors.password?.message} />
          <Input label="Household Name" placeholder="Smith Family"
            {...newForm.register("householdName")} error={newForm.formState.errors.householdName?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <select {...newForm.register("currency")}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          <Button type="submit" className="w-full" loading={newForm.formState.isSubmitting}>
            Create Account
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
