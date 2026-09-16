import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { todayStr } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalUsers = await db.user.count({ where: { role: "USER" } });
  const totalAdmins = await db.user.count({ where: { role: "ADMIN" } });

  const profiles = await db.userProfile.findMany({
    select: {
      xp: true,
      level: true,
      streak: true,
      totalQuestions: true,
      correctQuestions: true,
      estimatedScore: true,
      lastActivityDate: true,
    },
  });

  const totalXp = profiles.reduce((s, p) => s + p.xp, 0);
  const totalQuestions = profiles.reduce((s, p) => s + p.totalQuestions, 0);
  const totalCorrect = profiles.reduce((s, p) => s + p.correctQuestions, 0);
  const scoredProfiles = profiles.filter((p) => p.estimatedScore > 0);
  const avgScore =
    scoredProfiles.length > 0
      ? Math.round(
          scoredProfiles.reduce((s, p) => s + p.estimatedScore, 0) /
            scoredProfiles.length,
        )
      : 0;
  const avgAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const today = todayStr();
  const activeToday = profiles.filter((p) => p.lastActivityDate === today).length;

  // New users in last 7 days
  const sevenAgo = new Date();
  sevenAgo.setDate(sevenAgo.getDate() - 7);
  const newThisWeek = await db.user.count({
    where: { createdAt: { gte: sevenAgo } },
  });

  // Users by level tier
  const tiers = {
    beginner: profiles.filter((p) => p.level < 4).length,
    intermediate: profiles.filter((p) => p.level >= 4 && p.level < 7).length,
    advanced: profiles.filter((p) => p.level >= 7 && p.level < 12).length,
    expert: profiles.filter((p) => p.level >= 12).length,
  };

  return NextResponse.json({
    totalUsers,
    totalAdmins,
    totalXp,
    totalQuestions,
    totalCorrect,
    avgScore,
    avgAccuracy,
    activeToday,
    newThisWeek,
    tiers,
  });
}
