import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfile(userId);
  const links = await db.userAchievement.findMany({
    where: { profileId: profile.id },
    include: { achievement: true },
    orderBy: [{ unlocked: "desc" }, { progress: "desc" }],
  });
  const achievements = links.map((l) => ({
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
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  return NextResponse.json({ achievements, unlockedCount, total: achievements.length });
}
