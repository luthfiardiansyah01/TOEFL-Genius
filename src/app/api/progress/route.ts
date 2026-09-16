import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { getAuthUserId } from "@/lib/auth";
import { recommendNext } from "@/lib/ai";
import { levelFromXp } from "@/lib/constants";
import type { ProgressData, ActivityFeedItem, WeaknessItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfile(userId);

  const recentActivities = await db.activityLog.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const weaknesses = await db.weakness.findMany({
    where: { profileId: profile.id, totalCount: { gte: 2 } },
    orderBy: { errorCount: "desc" },
    take: 8,
  });

  const achievementLinks = await db.userAchievement.findMany({
    where: { profileId: profile.id },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });

  // accuracy by skill
  const attempts = await db.questionAttempt.findMany({
    where: { profileId: profile.id },
    select: { skill: true, isCorrect: true, createdAt: true },
  });
  const bySkill: Record<string, { total: number; correct: number }> = {};
  for (const a of attempts) {
    bySkill[a.skill] = bySkill[a.skill] || { total: 0, correct: 0 };
    bySkill[a.skill].total++;
    if (a.isCorrect) bySkill[a.skill].correct++;
  }
  const accuracyBySkill = Object.entries(bySkill).map(([skill, v]) => ({
    skill,
    total: v.total,
    correct: v.correct,
    accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  // XP history (last 7 days) based on activity logs
  const xpHistory: { date: string; xp: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const dayActs = await db.activityLog.findMany({
      where: {
        profileId: profile.id,
        createdAt: { gte: start, lte: end },
      },
      select: { xpEarned: true },
    });
    const xp = dayActs.reduce((s, a) => s + a.xpEarned, 0);
    xpHistory.push({ date: dayStr, xp });
  }

  const lvl = levelFromXp(profile.xp);

  const progress: ProgressData = {
    xp: profile.xp,
    level: profile.level,
    streak: profile.streak,
    longestStreak: profile.longestStreak,
    totalQuestions: profile.totalQuestions,
    correctQuestions: profile.correctQuestions,
    accuracy:
      profile.totalQuestions > 0
        ? Math.round((profile.correctQuestions / profile.totalQuestions) * 100)
        : 0,
    estimatedScore: profile.estimatedScore,
    readingScore: profile.readingScore,
    listeningScore: profile.listeningScore,
    speakingScore: profile.speakingScore,
    writingScore: profile.writingScore,
    dailyGoalXp: profile.dailyGoalXp,
    dailyXpEarned: profile.dailyXpEarned,
    name: profile.name,
  };

  const activities: ActivityFeedItem[] = recentActivities.map((a) => ({
    id: a.id,
    type: a.type,
    skill: a.skill ?? undefined,
    title: a.title ?? undefined,
    score: a.score ?? undefined,
    xpEarned: a.xpEarned,
    correct: a.correct ?? undefined,
    total: a.total ?? undefined,
    createdAt: a.createdAt.toISOString(),
  }));

  const weaknessItems: WeaknessItem[] = weaknesses.map((w) => ({
    skill: w.skill,
    subskill: w.subskill || undefined,
    errorCount: w.errorCount,
    totalCount: w.totalCount,
    errorRate: w.totalCount ? w.errorCount / w.totalCount : 0,
  }));

  const achievements = achievementLinks.map((l) => ({
    code: l.achievement.code,
    title: l.achievement.title,
    description: l.achievement.description,
    icon: l.achievement.icon,
    category: l.achievement.category,
    tier: l.achievement.tier,
    threshold: l.achievement.threshold,
    progress: l.progress,
    unlocked: l.unlocked,
    unlockedAt: l.unlockedAt?.toISOString() ?? null,
  }));

  let recommendation = null;
  try {
    const recentSkills = recentActivities
      .map((a) => a.skill)
      .filter(Boolean)
      .slice(0, 5) as string[];
    recommendation = await recommendNext({
      weaknesses: weaknessItems.slice(0, 5),
      recentSkills,
    });
  } catch {
    recommendation = null;
  }

  return NextResponse.json({
    progress,
    intoLevel: lvl.intoLevel,
    neededForLevel: lvl.neededForLevel,
    levelProgressPct: lvl.progressPct,
    activities,
    weaknesses: weaknessItems,
    achievements,
    accuracyBySkill,
    xpHistory,
    recommendation,
  });
}
