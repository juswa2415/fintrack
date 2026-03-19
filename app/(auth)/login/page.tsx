"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    // If came from an invite link, accept the invite after login
    if (inviteToken) {
      // Get current user id from session
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (session?.user?.id) {
        await fetch("/api/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken, userId: session.user.id }),
        });
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-1">
          {inviteToken ? "Sign in to accept your household invite" : "Sign in to your FinTrack account"}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com"
            {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••"
            {...register("password")} error={errors.password?.message} />

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {inviteToken ? "Sign in & Join Household" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        Don&apos;t have an account?{" "}
        <Link
          href={inviteToken ? `/register?invite=${inviteToken}` : "/register"}
          className="text-indigo-600 hover:underline font-medium"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
