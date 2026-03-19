export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireHousehold } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const { searchParams } = new URL(req.url);

    const where: any = { householdId: household.id };
    if (searchParams.get("type")) where.type = searchParams.get("type");

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const household = await requireHousehold(session.user.id);
    const body = await req.json();
    const data = schema.parse(body);

    const category = await prisma.category.create({
      data: {
        householdId: household.id,
        name: data.name,
        type: data.type,
        icon: data.icon ?? "circle",
        color: data.color ?? "#6366f1",
        isDefault: false,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
