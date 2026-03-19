import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { household: true, sender: { select: { name: true } } },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-500 mb-4">This invite link is invalid or has expired.</p>
          <Link href="/login" className="text-indigo-600 hover:underline">Go to login</Link>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect(`/register?invite=${token}`);
  }

  const alreadyMember = await prisma.householdMember.findFirst({
    where: { householdId: invite.householdId, userId: session.user.id },
  });

  if (!alreadyMember) {
    await prisma.$transaction([
      prisma.householdMember.create({
        data: { householdId: invite.householdId, userId: session.user.id, role: "MEMBER" },
      }),
      prisma.invite.update({ where: { token }, data: { status: "ACCEPTED" } }),
    ]);
  }

  redirect("/dashboard");
}
