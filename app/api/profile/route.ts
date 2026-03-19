export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2),
  currency: z.string().min(1).optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(data.currentPassword, user.password ?? "");
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const updateData: any = { name: data.name };
    if (data.currency) updateData.currency = data.currency;
    if (data.newPassword) updateData.password = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({ where: { id: session.user.id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, currency: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
