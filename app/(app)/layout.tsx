import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserHousehold } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const household = await getUserHousehold(session.user.id);
  if (!household) redirect("/register");

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 min-h-full">
        <TopBar householdName={household.name} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
