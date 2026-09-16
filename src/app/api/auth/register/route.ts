import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { seedAchievements } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const cleanEmail = email?.trim().toLowerCase();
    const cleanName = name?.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }
    if (!cleanName || cleanName.length < 1) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email: cleanEmail, name: cleanName, passwordHash },
    });

    // create a fresh profile linked to this user
    const profile = await db.userProfile.create({
      data: { userId: user.id, name: cleanName },
    });
    await seedAchievements(profile.id);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    console.error("[api/auth/register] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 500 },
    );
  }
}
