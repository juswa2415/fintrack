"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  name: z.string().min(2),
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: session?.user?.name ?? "" },
  });

  const onSubmit = async (data: FormData) => {
    setError(""); setSuccess("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    await update({ name: data.name });
    setSuccess("Profile updated successfully");
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-700">
                {session?.user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Display Name" {...register("name")} error={errors.name?.message} />
            <Input label="Current Password" type="password" {...register("currentPassword")} error={errors.currentPassword?.message} />
            <Input label="New Password (leave blank to keep current)" type="password" placeholder="••••••••" {...register("newPassword")} error={errors.newPassword?.message} />

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
            {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

            <Button type="submit" loading={isSubmitting}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
