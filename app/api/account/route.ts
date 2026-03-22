export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Google users have no password — they send { googleDelete: true }
    const isGoogleUser = !user.password;

    if (isGoogleUser) {
      // No password to verify, just confirm the flag was sent
      if (!body.googleDelete) {
        return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
      }
    } else {
      // Credential users must supply their password
      const password = body.password;
      if (!password || typeof password !== "string" || password.length < 1) {
        return NextResponse.json({ error: "Password is required to confirm deletion" }, { status: 400 });
      }
      const valid = await bcrypt.compare(password, user.password ?? "");
      if (!valid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
      }
    }

    // Cascade deletes all transactions, budgets, goals, categories, recurring
    await prisma.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
