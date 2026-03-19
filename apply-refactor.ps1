# Run from your fintrack project root:
# powershell -ExecutionPolicy Bypass -File apply-refactor.ps1

Write-Host "Applying FinTrack refactor - removing household..." -ForegroundColor Cyan

# ── 1. DELETE old files/folders ──
$toDelete = @(
  "app/api/household",
  "app/api/invite",
  "app/(auth)/invite",
  "app/(app)/settings/household",
  "app/api/account/route.ts",
  "components/layout/topbar.tsx"
)
foreach ($path in $toDelete) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
    Write-Host "  Deleted: $path" -ForegroundColor Red
  }
}

# ── 2. FIX lib/auth.ts - handle nullable password ──
$auth = Get-Content "lib/auth.ts" -Raw
$auth = $auth -replace 'user\.password\b', '(user.password ?? "")'
Set-Content "lib/auth.ts" $auth
Write-Host "OK lib/auth.ts password null fix" -ForegroundColor Green

# ── 3. FIX lib/session.ts - remove household helpers ──
$session = @'
import { auth } from "@/lib/auth";

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
'@
Set-Content "lib/session.ts" $session
Write-Host "OK lib/session.ts simplified" -ForegroundColor Green

# ── 4. FIX lib/categories.ts - userId not householdId ──
$cats = Get-Content "lib/categories.ts" -Raw
$cats = $cats -replace 'householdId: string', 'userId: string'
$cats = $cats -replace '\bhouseholdId\b', 'userId'
Set-Content "lib/categories.ts" $cats
Write-Host "OK lib/categories.ts userId fix" -ForegroundColor Green

# ── 5. FIX lib/use-currency.ts ──
$uc = @'
"use client";

import { useState, useEffect } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.currency) setCurrency(json.currency);
      })
      .catch(() => {});
  }, []);

  return currency;
}
'@
Set-Content "lib/use-currency.ts" $uc
Write-Host "OK lib/use-currency.ts updated" -ForegroundColor Green

# ── 6. FIX app/(app)/layout.tsx ──
$layout = @'
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell userName={session.user.name ?? ""}>
      {children}
    </AppShell>
  );
}
'@
Set-Content "app/(app)/layout.tsx" $layout
Write-Host "OK app/(app)/layout.tsx updated" -ForegroundColor Green

# ── 7. FIX api/profile/route.ts - add GET + fix nullable password ──
$profile = @'
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, currency: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

const schema = z.object({
  name: z.string().min(2),
  currency: z.string().min(1).optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const valid = await bcrypt.compare(data.currentPassword, user.password ?? "");
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    const updateData: any = { name: data.name };
    if (data.currency) updateData.currency = data.currency;
    if (data.newPassword) updateData.password = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
'@
Set-Content "app/api/profile/route.ts" $profile
Write-Host "OK app/api/profile/route.ts updated" -ForegroundColor Green

# ── 8. CREATE app/api/account/route.ts ──
New-Item -ItemType Directory -Force -Path "app/api/account" | Out-Null
$account = @'
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { password } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const valid = await bcrypt.compare(password, user.password ?? "");
    if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
'@
Set-Content "app/api/account/route.ts" $account
Write-Host "OK app/api/account/route.ts created" -ForegroundColor Green

# ── 9. FIX api/register/route.ts ──
$register = @'
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { seedDefaultCategories } from "@/lib/categories";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  currency: z.string().min(1).default("USD"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed, currency: data.currency },
    });
    await seedDefaultCategories(user.id, prisma);
    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
'@
Set-Content "app/api/register/route.ts" $register
Write-Host "OK app/api/register/route.ts updated" -ForegroundColor Green

Write-Host ""
Write-Host "Now run the migration:" -ForegroundColor Cyan
Write-Host "  npx prisma migrate dev --name remove-household"
Write-Host ""
Write-Host "Then copy these files from outputs to your project:" -ForegroundColor Cyan
Write-Host "  dashboard-page.tsx   -> app/(app)/dashboard/page.tsx"
Write-Host "  api-transactions-route.ts -> app/api/transactions/route.ts"
Write-Host "  api-transactions-id-route.ts -> app/api/transactions/[id]/route.ts"
Write-Host "  api-categories-route.ts -> app/api/categories/route.ts"
Write-Host "  api-categories-id-route.ts -> app/api/categories/[id]/route.ts"
Write-Host "  api-budget-route.ts -> app/api/budget/route.ts"
Write-Host "  api-budget-id-route.ts -> app/api/budget/[id]/route.ts"
Write-Host "  api-goals-route.ts -> app/api/goals/route.ts"
Write-Host "  api-goals-id-route.ts -> app/api/goals/[id]/route.ts"
Write-Host "  api-recurring-route.ts -> app/api/recurring/route.ts"
Write-Host "  api-recurring-id-route.ts -> app/api/recurring/[id]/route.ts"
Write-Host "  api-reports-route.ts -> app/api/reports/route.ts"
Write-Host "  app-layout.tsx -> app/(app)/layout.tsx (already done above)"
Write-Host "  app-shell.tsx -> components/layout/app-shell.tsx"
Write-Host "  sidebar.tsx -> components/layout/sidebar.tsx"
Write-Host "  register-page.tsx -> app/(auth)/register/page.tsx"
Write-Host "  profile-page.tsx -> app/(app)/settings/profile/page.tsx"
