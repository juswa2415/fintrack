# Run from your fintrack project root:
# powershell -ExecutionPolicy Bypass -File place-files.ps1

Write-Host "Placing all files into project..." -ForegroundColor Cyan

# Where your downloaded output files are
# Change this path if you saved them somewhere else
$src = "$PSScriptRoot"

function Place($file, $dest) {
  $destDir = Split-Path $dest -Parent
  if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item $file $dest -Force
  Write-Host "  OK $dest" -ForegroundColor Green
}

# API Routes
Place "$src\api-transactions-route.ts"    "app\api\transactions\route.ts"
Place "$src\api-transactions-id-route.ts" "app\api\transactions\[id]\route.ts"
Place "$src\api-categories-route.ts"      "app\api\categories\route.ts"
Place "$src\api-categories-id-route.ts"   "app\api\categories\[id]\route.ts"
Place "$src\api-budget-route.ts"          "app\api\budget\route.ts"
Place "$src\api-budget-id-route.ts"       "app\api\budget\[id]\route.ts"
Place "$src\api-goals-route.ts"           "app\api\goals\route.ts"
Place "$src\api-goals-id-route.ts"        "app\api\goals\[id]\route.ts"
Place "$src\api-recurring-route.ts"       "app\api\recurring\route.ts"
Place "$src\api-recurring-id-route.ts"    "app\api\recurring\[id]\route.ts"
Place "$src\api-reports-route.ts"         "app\api\reports\route.ts"
Place "$src\api-register-route.ts"        "app\api\register\route.ts"
Place "$src\api-profile-route.ts"         "app\api\profile\route.ts"
Place "$src\api-account-route.ts"         "app\api\account\route.ts"

# Pages
Place "$src\dashboard-page.tsx"           "app\(app)\dashboard\page.tsx"
Place "$src\register-page.tsx"            "app\(auth)\register\page.tsx"
Place "$src\profile-page.tsx"             "app\(app)\settings\profile\page.tsx"
Place "$src\transactions-page-final.tsx"  "app\(app)\transactions\page.tsx"
Place "$src\recurring-page-final.tsx"     "app\(app)\recurring\page.tsx"
Place "$src\reports-page-final.tsx"       "app\(app)\reports\page.tsx"

# Layout and components
Place "$src\app-layout.tsx"               "app\(app)\layout.tsx"
Place "$src\app-shell.tsx"                "components\layout\app-shell.tsx"
Place "$src\sidebar.tsx"                  "components\layout\sidebar.tsx"

Write-Host ""
Write-Host "All files placed!" -ForegroundColor Cyan
Write-Host "Now run:" -ForegroundColor Yellow
Write-Host "  git add ."
Write-Host "  git commit -m `"refactor: remove household, every user is independent`""
Write-Host "  git push origin main"
