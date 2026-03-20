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

const googleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  currency: z.string().min(1),
});

const emailSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  currency: z.string().min(1),
  currentPassword: z.string().min(1, "Required to save changes"),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

const deleteEmailSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirm: z.string(),
}).refine((d) => d.confirm === "DELETE", {
  message: "Type DELETE to confirm",
  path: ["confirm"],
});

const deleteGoogleSchema = z.object({
  confirm: z.string(),
}).refine((d) => d.confirm === "DELETE", {
  message: "Type DELETE to confirm",
  path: ["confirm"],
});

type GoogleData = z.infer<typeof googleSchema>;
type EmailData = z.infer<typeof emailSchema>;
type DeleteEmailData = z.infer<typeof deleteEmailSchema>;
type DeleteGoogleData = z.infer<typeof deleteGoogleSchema>;

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
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const googleForm = useForm<GoogleData>({
    resolver: zodResolver(googleSchema),
    defaultValues: { name: "", currency: "USD" },
  });

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { name: "", currency: "USD", currentPassword: "", newPassword: "" },
  });

  const deleteEmailForm = useForm<DeleteEmailData>({ resolver: zodResolver(deleteEmailSchema) });
  const deleteGoogleForm = useForm<DeleteGoogleData>({ resolver: zodResolver(deleteGoogleSchema) });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        const name = json.name ?? "";
        const currency = json.currency ?? "USD";
        googleForm.setValue("name", name);
        googleForm.setValue("currency", currency);
        emailForm.setValue("name", name);
        emailForm.setValue("currency", currency);
        setCurrentCurrency(currency);
        setIsGoogleUser(!json.hasPassword);
        setLoaded(true);
      });
  }, []);

  const onSubmitGoogle = async (data: GoogleData) => {
    setError(""); setSuccess("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, currency: data.currency }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    await update({ name: data.name });
    setCurrentCurrency(data.currency);
    setSuccess("Profile updated successfully");
  };

  const onSubmitEmail = async (data: EmailData) => {
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
    emailForm.setValue("currentPassword", "");
    emailForm.setValue("newPassword", "");
    setSuccess("Profile updated successfully");
  };

  const onDeleteEmail = async (data: DeleteEmailData) => {
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

  const onDeleteGoogle = async (data: DeleteGoogleData) => {
    setDeleteError("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleDelete: true }),
    });
    const json = await res.json();
    if (!res.ok) { setDeleteError(json.error); return; }
    await signOut({ callbackUrl: "/login" });
  };

  if (!loaded) return <div className="animate-pulse h-64 bg-gray-100 rounded-2xl max-w-md" />;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-bold text-indigo-700">
                  {session?.user?.name?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">Currency: {currentCurrency}</p>
                {isGoogleUser && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    Google account
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isGoogleUser ? (
            <form onSubmit={googleForm.handleSubmit(onSubmitGoogle)} className="space-y-4">
              <Input label="Display Name"
                {...googleForm.register("name")}
                error={googleForm.formState.errors.name?.message} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <select {...googleForm.register("currency")}
                  className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Your account is managed by Google. Password changes are not available.
              </p>
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
              {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}
              <Button type="submit" loading={googleForm.formState.isSubmitting}>Save Changes</Button>
            </form>
          ) : (
            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
              <Input label="Display Name"
                {...emailForm.register("name")}
                error={emailForm.formState.errors.name?.message} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <select {...emailForm.register("currency")}
                  className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</p>
                <Input label="Current Password (required to save)" type="password"
                  {...emailForm.register("currentPassword")}
                  error={emailForm.formState.errors.currentPassword?.message} />
                <Input label="New Password (leave blank to keep current)" type="password" placeholder="••••••••"
                  {...emailForm.register("newPassword")}
                  error={emailForm.formState.errors.newPassword?.message} />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
              {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}
              <Button type="submit" loading={emailForm.formState.isSubmitting}>Save Changes</Button>
            </form>
          )}
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
              <Button variant="destructive" size="sm" className="mt-3"
                onClick={() => { deleteEmailForm.reset(); deleteGoogleForm.reset(); setDeleteError(""); setDeleteOpen(true); }}>
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
            <p className="text-xs text-red-600 mt-1">All your transactions, budgets, goals, and categories will be deleted.</p>
          </div>
          {isGoogleUser ? (
            <form onSubmit={deleteGoogleForm.handleSubmit(onDeleteGoogle)} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input {...deleteGoogleForm.register("confirm")}
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE" />
                {deleteGoogleForm.formState.errors.confirm && (
                  <p className="text-xs text-red-600">{deleteGoogleForm.formState.errors.confirm.message}</p>
                )}
              </div>
              {deleteError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{deleteError}</div>}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" className="flex-1" loading={deleteGoogleForm.formState.isSubmitting}>
                  Delete My Account
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={deleteEmailForm.handleSubmit(onDeleteEmail)} className="space-y-4">
              <Input label="Enter your password to confirm" type="password" placeholder="••••••••"
                {...deleteEmailForm.register("password")}
                error={deleteEmailForm.formState.errors.password?.message} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input {...deleteEmailForm.register("confirm")}
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE" />
                {deleteEmailForm.formState.errors.confirm && (
                  <p className="text-xs text-red-600">{deleteEmailForm.formState.errors.confirm.message}</p>
                )}
              </div>
              {deleteError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{deleteError}</div>}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" className="flex-1" loading={deleteEmailForm.formState.isSubmitting}>
                  Delete My Account
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
