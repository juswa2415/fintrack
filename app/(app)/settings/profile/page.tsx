"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertTriangle } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2),
  currency: z.string().min(1),
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirm: z.string(),
}).refine((d) => d.confirm === "DELETE", {
  message: "Type DELETE to confirm",
  path: ["confirm"],
});

type ProfileData = z.infer<typeof profileSchema>;
type DeleteData = z.infer<typeof deleteSchema>;

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [currentCurrency, setCurrentCurrency] = useState("USD");

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", currency: "USD" },
  });

  const deleteForm = useForm<DeleteData>({
    resolver: zodResolver(deleteSchema),
  });

  // Load current profile data
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.name) profileForm.setValue("name", json.name);
        if (json.currency) {
          profileForm.setValue("currency", json.currency);
          setCurrentCurrency(json.currency);
        }
      });
  }, []);

  const onSubmitProfile = async (data: ProfileData) => {
    setError(""); setSuccess("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    await update({ name: data.name });
    setCurrentCurrency(data.currency);
    setSuccess("Profile updated successfully");
  };

  const onSubmitDelete = async (data: DeleteData) => {
    setDeleteError("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: data.password }),
    });
    const json = await res.json();
    if (!res.ok) { setDeleteError(json.error); return; }
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-700">
                {session?.user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Currency: {currentCurrency}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
            <Input label="Display Name"
              {...profileForm.register("name")}
              error={profileForm.formState.errors.name?.message} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Currency</label>
              <select {...profileForm.register("currency")}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <Input label="Current Password" type="password"
              {...profileForm.register("currentPassword")}
              error={profileForm.formState.errors.currentPassword?.message} />
            <Input label="New Password (leave blank to keep current)" type="password"
              placeholder="••••••••"
              {...profileForm.register("newPassword")}
              error={profileForm.formState.errors.newPassword?.message} />

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
            {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

            <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-700">Delete Account</h3>
              <p className="text-xs text-gray-500 mt-1">
                Permanently delete your account and all your financial data. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => { deleteForm.reset(); setDeleteError(""); setDeleteOpen(true); }}
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">This action is permanent and cannot be undone.</p>
            <p className="text-xs text-red-600 mt-1">
              All your transactions, budgets, goals, and categories will be permanently deleted.
            </p>
          </div>
          <form onSubmit={deleteForm.handleSubmit(onSubmitDelete)} className="space-y-4">
            <Input label="Enter your password to confirm" type="password" placeholder="••••••••"
              {...deleteForm.register("password")}
              error={deleteForm.formState.errors.password?.message} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input {...deleteForm.register("confirm")}
                className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="DELETE" />
              {deleteForm.formState.errors.confirm && (
                <p className="text-xs text-red-600">{deleteForm.formState.errors.confirm.message}</p>
              )}
            </div>
            {deleteError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{deleteError}</div>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" className="flex-1" loading={deleteForm.formState.isSubmitting}>
                Delete My Account
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
