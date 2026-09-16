import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** DELETE /api/admin/users/[id] — permanently delete a user account + all its data. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Prevent self-deletion to avoid locking yourself out.
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted." },
      { status: 400 },
    );
  }

  // Cascading deletes on UserProfile → activities/attempts/achievements/weaknesses.
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** PATCH /api/admin/users/[id] — reset a user's learning progress (keeps the account). */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin progress cannot be reset." },
      { status: 400 },
    );
  }

  // Wipe all learning data for the user's profile.
  const profile = await db.userProfile.findFirst({ where: { userId: id } });
  if (profile) {
    await db.questionAttempt.deleteMany({ where: { profileId: profile.id } });
    await db.activityLog.deleteMany({ where: { profileId: profile.id } });
    await db.weakness.deleteMany({ where: { profileId: profile.id } });
    await db.userAchievement.deleteMany({ where: { profileId: profile.id } });
    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalQuestions: 0,
        correctQuestions: 0,
        estimatedScore: 0,
        readingScore: 0,
        listeningScore: 0,
        speakingScore: 0,
        writingScore: 0,
        dailyXpEarned: 0,
        dailyXpDate: null,
      },
    });
    // re-seed achievement links so progress bars start fresh
    const { seedAchievements } = await import("@/lib/profile");
    await seedAchievements(profile.id);
  }

  return NextResponse.json({ ok: true });
}
