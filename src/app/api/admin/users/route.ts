import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      profile: {
        select: {
          xp: true,
          level: true,
          streak: true,
          longestStreak: true,
          totalQuestions: true,
          correctQuestions: true,
          estimatedScore: true,
          readingScore: true,
          listeningScore: true,
          speakingScore: true,
          writingScore: true,
          lastActivityDate: true,
        },
      },
    },
  });

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    xp: u.profile?.xp ?? 0,
    level: u.profile?.level ?? 1,
    streak: u.profile?.streak ?? 0,
    longestStreak: u.profile?.longestStreak ?? 0,
    totalQuestions: u.profile?.totalQuestions ?? 0,
    correctQuestions: u.profile?.correctQuestions ?? 0,
    accuracy:
      u.profile && u.profile.totalQuestions > 0
        ? Math.round(
            (u.profile.correctQuestions / u.profile.totalQuestions) * 100,
          )
        : 0,
    estimatedScore: u.profile?.estimatedScore ?? 0,
    readingScore: u.profile?.readingScore ?? 0,
    listeningScore: u.profile?.listeningScore ?? 0,
    speakingScore: u.profile?.speakingScore ?? 0,
    writingScore: u.profile?.writingScore ?? 0,
    lastActivityDate: u.profile?.lastActivityDate ?? null,
    hasProfile: !!u.profile,
  }));

  return NextResponse.json({ users: rows, total: rows.length });
}
