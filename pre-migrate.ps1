# Run from fintrack project root BEFORE migrating:
# powershell -ExecutionPolicy Bypass -File pre-migrate.ps1
#
# This script sets hasSeenOnboarding=true for all existing users
# so they don't see the onboarding tour after the migration.
# It also handles the goals categoryId requirement.

Write-Host "Running pre-migration setup..." -ForegroundColor Cyan

# Create a temporary seed script
$seed = @'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Mark all existing users as having seen onboarding
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { hasSeenOnboarding: true },
    });
  }
  console.log(`Marked ${users.length} existing user(s) as onboarding complete`);

  // Delete existing goals (they have no categoryId, migration will fail)
  const deleted = await prisma.goal.deleteMany({});
  console.log(`Cleared ${deleted.count} existing goal(s) — please recreate them after migration`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
'@

Set-Content "pre-migrate-seed.cjs" $seed
Write-Host "Running seed..." -ForegroundColor Yellow
node pre-migrate-seed.cjs
Remove-Item "pre-migrate-seed.cjs"

Write-Host ""
Write-Host "Done! Now run:" -ForegroundColor Cyan
Write-Host "  npx prisma migrate dev --name goals-category-onboarding"
