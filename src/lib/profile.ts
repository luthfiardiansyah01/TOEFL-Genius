import { db } from "./db";

/**
 * Returns the active learner profile (single-user app).
 * Creates it on first run, and ensures achievements exist.
 */
export async function getProfile() {
  let profile = await db.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await db.userProfile.create({
      data: { name: "Learner" },
    });
    await seedAchievements(profile.id);
  } else {
    // ensure achievements seeded (idempotent)
    await seedAchievements(profile.id);
  }

  // Refresh streak + daily XP on read
  const today = todayStr();
  if (profile.lastActivityDate && profile.lastActivityDate !== today) {
    // streak may have broken
    const yesterday = shiftDay(today, -1);
    if (profile.lastActivityDate !== yesterday) {
      // broken streak
      if (profile.streak !== 0) {
        profile = await db.userProfile.update({
          where: { id: profile.id },
          data: { streak: 0 },
        });
      }
    }
  }
  // reset daily XP if date changed
  if (profile.dailyXpDate !== today) {
    profile = await db.userProfile.update({
      where: { id: profile.id },
      data: { dailyXpEarned: 0, dailyXpDate: today },
    });
  }
  return profile;
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return todayStr(dt);
}

async function seedAchievements(profileId: string) {
  // Import here to avoid circular import at module load
  const { ACHIEVEMENT_DEFS } = await import("./constants");
  for (const def of ACHIEVEMENT_DEFS) {
    const existing = await db.achievement.findUnique({ where: { code: def.code } });
    if (!existing) {
      await db.achievement.create({
        data: {
          code: def.code,
          title: def.title,
          description: def.description,
          icon: def.icon,
          category: def.category,
          threshold: def.threshold,
          tier: def.tier,
        },
      });
    }
  }
  // link to user
  const all = await db.achievement.findMany();
  for (const a of all) {
    await db.userAchievement.upsert({
      where: {
        profileId_achievementId: { profileId, achievementId: a.id },
      },
      update: {},
      create: { profileId, achievementId: a.id },
    });
  }
}
