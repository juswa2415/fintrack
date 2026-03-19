export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  deadline: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
