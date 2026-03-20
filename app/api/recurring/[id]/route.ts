export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const patchSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  resetLastLogged: z.boolean().optional(), // explicit reset flag from UI
});

function isLoggedThisPeriod(frequency: string, lastLogged: Date | null): boolean {
  if (!lastLogged) return false;
  const now = new Date();
  switch (frequency) {
    case "DAILY":
      return lastLogged.toDateString() === now.toDateString();
    case "WEEKLY":
      return Math.floor((now.getTime() - lastLogged.getTime()) / 86400000) < 7;
    case "MONTHLY":
      return lastLogged.getMonth() === now.getMonth() &&
        lastLogged.getFullYear() === now.getFullYear();
    case "YEARLY":
      return lastLogged.getFullYear() === now.getFullYear();
    default:
      return false;
  }
}

function getMissedPeriods(frequency: string, startDate: Date, lastLogged: Date | null): Date[] {
  const now = new Date();
  const dates: Date[] = [];
  let cursor = new Date(startDate);

  if (lastLogged) {
    while (cursor <= lastLogged) {
      cursor = advanceByFrequency(cursor, frequency);
    }
  }

  while (cursor <= now) {
    dates.push(new Date(cursor));
    cursor = advanceByFrequency(cursor, frequency);
  }

  return dates;
}

function advanceByFrequency(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY": d.setDate(d.getDate() + 1); break;
    case "WEEKLY": d.setDate(d.getDate() + 7); break;
    case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
    case "YEARLY": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const paymentDates: string[] | undefined = body.paymentDates;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Multi-payment mode
    if (paymentDates && paymentDates.length > 0) {
      const transactions = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const dateStr of paymentDates) {
          const t = await tx.transaction.create({
            data: {
              userId: session.user.id,
              categoryId: recurring.categoryId,
              recurringTransactionId: id,
              amount: recurring.amount,
              type: recurring.type,
              date: new Date(dateStr),
              description: recurring.description ?? undefined,
            },
            include: { category: true },
          });
          created.push(t);
        }
        const latestDate = paymentDates.reduce((a, b) => new Date(a) > new Date(b) ? a : b);
        await tx.recurringTransaction.update({
          where: { id },
          data: { lastLogged: new Date(latestDate) },
        });
        return created;
      });
      return NextResponse.json(transactions, { status: 201 });
    }

    // Double-log guard
    if (!force && isLoggedThisPeriod(recurring.frequency, recurring.lastLogged)) {
      return NextResponse.json(
        { error: "already_logged", message: `Already logged this ${recurring.frequency.toLowerCase()} period` },
        { status: 409 }
      );
    }

    // Missed periods check
    const missed = getMissedPeriods(recurring.frequency, recurring.startDate, recurring.lastLogged);
    if (!force && missed.length > 1) {
      return NextResponse.json(
        { error: "missed_periods", missedDates: missed.map((d) => d.toISOString()), count: missed.length },
        { status: 202 }
      );
    }

    // Single payment
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: session.user.id,
          categoryId: recurring.categoryId,
          recurringTransactionId: id,
          amount: recurring.amount,
          type: recurring.type,
          date: new Date(),
          description: recurring.description ?? undefined,
        },
        include: { category: true },
      });
      await tx.recurringTransaction.update({
        where: { id },
        data: { lastLogged: new Date() },
      });
      return created;
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = patchSchema.parse(body);

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...data };
    delete updateData.resetLastLogged;

    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    // If startDate moved earlier than current lastLogged, or explicit reset requested
    if (data.resetLastLogged || (data.startDate && recurring.lastLogged)) {
      const newStart = data.startDate ? new Date(data.startDate) : recurring.startDate;
      if (data.resetLastLogged || newStart < recurring.startDate) {
        updateData.lastLogged = null;
      }
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
