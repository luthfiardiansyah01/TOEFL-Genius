import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { recommendNext } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getProfile();
    const weaknesses = await db.weakness.findMany({
      where: { profileId: profile.id, totalCount: { gte: 2 } },
      orderBy: { errorCount: "desc" },
      take: 5,
    });
    const recentActivities = await db.activityLog.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { skill: true },
    });
    const weaknessItems = weaknesses.map((w) => ({
      skill: w.skill,
      subskill: w.subskill || undefined,
      errorRate: w.totalCount ? w.errorCount / w.totalCount : 0,
      totalCount: w.totalCount,
    }));
    const recentSkills = recentActivities
      .map((a) => a.skill)
      .filter(Boolean) as string[];
    const rec = await recommendNext({
      weaknesses: weaknessItems,
      recentSkills,
    });
    return NextResponse.json(rec);
  } catch (e) {
    console.error("[api/recommend] error", e);
    return NextResponse.json(
      {
        skill: "reading",
        activity: "reading",
        difficulty: "medium",
        title: "Practice Reading",
        reason: "Let's keep your momentum going with a reading passage.",
      },
      { status: 200 },
    );
  }
}
