import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function getUserHousehold(userId: string) {
  const member = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
    orderBy: { joinedAt: "asc" },
  });
  return member?.household ?? null;
}

export async function requireHousehold(userId: string) {
  const household = await getUserHousehold(userId);
  if (!household) throw new Error("No household found");
  return household;
}
