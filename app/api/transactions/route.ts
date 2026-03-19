export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const where: any = { userId: session.user.id };
    if (searchParams.get("type")) where.type = searchParams.get("type");
    if (searchParams.get("categoryId")) where.categoryId = searchParams.get("categoryId");
    if (searchParams.get("from") || searchParams.get("to")) {
      where.date = {};
      if (searchParams.get("from")) where.date.gte = new Date(searchParams.get("from")!);
      if (searchParams.get("to")) where.date.lte = new Date(searchParams.get("to")!);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      take: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
    });

    return NextResponse.json(transactions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        date: new Date(data.date),
        description: data.description,
        notes: data.notes,
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
