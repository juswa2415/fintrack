export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

const schema = z.object({
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    const tx = await prisma.transaction.findFirst({
      where: { id, householdId: household.id },
    });
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true, user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { id } = await params;

    const tx = await prisma.transaction.findFirst({
      where: { id, householdId: household.id },
    });
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
