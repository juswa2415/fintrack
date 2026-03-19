"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  currency: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD" },
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Registration failed"); return; }

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start tracking your finances</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Your Name" placeholder="John Smith"
            {...register("name")} error={errors.name?.message} />
          <Input label="Email" type="email" placeholder="you@example.com"
            {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••"
            {...register("password")} error={errors.password?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <select {...register("currency")}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
