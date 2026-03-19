import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserHousehold } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const household = await getUserHousehold(session.user.id);
  if (!household) redirect("/register");

  return (
    <AppShell householdName={household.name} userName={session.user.name ?? ""}>
      {children}
    </AppShell>
  );
}
