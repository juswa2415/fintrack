# Run from fintrack project root:
# powershell -ExecutionPolicy Bypass -File fix-all.ps1

Write-Host "Applying all FinTrack fixes..." -ForegroundColor Cyan

# 1. Fix package.json build script
$pkg = Get-Content "package.json" -Raw
$pkg = $pkg -replace '"build": "next build"', '"build": "prisma generate && next build"'
Set-Content "package.json" $pkg
Write-Host "OK package.json build script fixed" -ForegroundColor Green

# 2. Fix categories page
$f = "app/(app)/settings/categories/page.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'z\.string\(\)\.default\("#6366f1"\)', 'z.string().min(1)'
Set-Content $f $c
Write-Host "OK categories page schema fixed" -ForegroundColor Green

# 3. Fix register page
$f = "app/(auth)/register/page.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'z\.string\(\)\.default\("USD"\)', 'z.string().min(1)'
Set-Content $f $c
Write-Host "OK register page schema fixed" -ForegroundColor Green

# 4. Fix api/register route
$f = "app/api/register/route.ts"
$c = Get-Content $f -Raw
$c = $c -replace 'z\.string\(\)\.default\("USD"\)', 'z.string().min(1)'
Set-Content $f $c
Write-Host "OK api/register schema fixed" -ForegroundColor Green

# 5. Add force-dynamic to all API routes
$routes = @(
  "app/api/budget/route.ts",
  "app/api/budget/[id]/route.ts",
  "app/api/categories/route.ts",
  "app/api/categories/[id]/route.ts",
  "app/api/goals/route.ts",
  "app/api/goals/[id]/route.ts",
  "app/api/household/route.ts",
  "app/api/profile/route.ts",
  "app/api/recurring/route.ts",
  "app/api/recurring/[id]/route.ts",
  "app/api/register/route.ts",
  "app/api/reports/route.ts",
  "app/api/transactions/route.ts",
  "app/api/transactions/[id]/route.ts"
)

$dynamicLine = 'export const dynamic = "force-dynamic";'

foreach ($route in $routes) {
  $content = Get-Content $route -Raw
  if ($content -notmatch 'export const dynamic') {
    $content = $dynamicLine + "`r`n`r`n" + $content
    Set-Content $route $content
    Write-Host "OK Added force-dynamic to $route" -ForegroundColor Green
  } else {
    Write-Host "-- Skipped $route already has dynamic" -ForegroundColor Gray
  }
}

# 6. Create lib/use-currency.ts
$lines = @(
  '"use client";',
  '',
  'import { useState, useEffect } from "react";',
  '',
  'export function useCurrency() {',
  '  const [currency, setCurrency] = useState("USD");',
  '',
  '  useEffect(() => {',
  '    fetch("/api/household")',
  '      .then((r) => r.json())',
  '      .then((json) => {',
  '        if (json.household?.currency) setCurrency(json.household.currency);',
  '      })',
  '      .catch(() => {});',
  '  }, []);',
  '',
  '  return currency;',
  '}'
)
Set-Content "lib/use-currency.ts" $lines
Write-Host "OK lib/use-currency.ts created" -ForegroundColor Green

Write-Host ""
Write-Host "All fixes applied! Now run:" -ForegroundColor Cyan
Write-Host "  git add ."
Write-Host "  git commit -m fix-all-vercel-build-issues"
Write-Host "  git push origin main"
