export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const schema = z.object({
  password: z.string().min(1, "Password is required to confirm deletion"),
});

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(password, user.password ?? "");
    if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 400 });

    // Cascade deletes all transactions, budgets, goals, categories, recurring
    await prisma.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
