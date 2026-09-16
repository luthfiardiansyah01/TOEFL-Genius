import { db } from "./db";
import { getProfile, todayStr, shiftDay } from "./profile";
import { XP_REWARDS, ACHIEVEMENT_DEFS, levelFromXp } from "./constants";
import type { SkillKey } from "./types";

/**
 * Apply XP, streak and accuracy updates when a learner answers / completes something.
 * Returns the updated profile + newly unlocked achievement codes.
 */
export interface ApplyResult {
  xpGained: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedAchievements: string[];
  streak: number;
  streakBonus: number;
}

export async function recordAnswer(opts: {
  skill: SkillKey | string;
  subskill?: string;
  difficulty: string;
  isCorrect: boolean;
  question: unknown;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}): Promise<ApplyResult> {
  const profile = await getProfile();
  const today = todayStr();
  const yesterday = shiftDay(today, -1);

  // streak handling
  let newStreak = profile.streak;
  if (profile.lastActivityDate === today) {
    // already active today, keep streak
  } else if (profile.lastActivityDate === yesterday) {
    newStreak = profile.streak + 1;
  } else {
    newStreak = 1; // restart
  }

  const baseXp =
    opts.difficulty === "hard"
      ? XP_REWARDS.correctHard
      : opts.difficulty === "easy"
        ? XP_REWARDS.correctEasy
        : XP_REWARDS.correctAnswer;
  const streakBonus = opts.isCorrect ? XP_REWARDS.streakBonus(newStreak) : 0;
  const xpGained = opts.isCorrect ? baseXp + streakBonus : 3; // small consolation XP

  const newXp = profile.xp + xpGained;
  const newLevel = levelFromXp(newXp).level;
  const leveledUp = newLevel > profile.level;

  const totalQuestions = profile.totalQuestions + 1;
  const correctQuestions = profile.correctQuestions + (opts.isCorrect ? 1 : 0);

  const updated = await db.userProfile.update({
    where: { id: profile.id },
    data: {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longestStreak: Math.max(profile.longestStreak, newStreak),
      lastActivityDate: today,
      totalQuestions,
      correctQuestions,
      dailyXpEarned: profile.dailyXpEarned + xpGained,
      dailyXpDate: today,
    },
  });

  // record attempt
  await db.questionAttempt.create({
    data: {
      profileId: profile.id,
      skill: String(opts.skill),
      subskill: opts.subskill ?? null,
      difficulty: opts.difficulty,
      question: JSON.stringify(opts.question),
      userAnswer: opts.userAnswer ?? null,
      correctAnswer: opts.correctAnswer ?? null,
      isCorrect: opts.isCorrect,
      explanation: opts.explanation ?? null,
    },
  });

  // update weakness tracking
  await updateWeakness(profile.id, String(opts.skill), opts.subskill, opts.isCorrect);

  // recompute estimated score (approx)
  await recomputeEstimatedScore(profile.id);

  // achievements
  const unlocked = await checkAchievements(profile.id, {
    totalQuestions,
    correctQuestions,
    streak: newStreak,
    level: newLevel,
    estimatedScore: (await db.userProfile.findUnique({ where: { id: profile.id } }))!.estimatedScore,
    skill: String(opts.skill),
    isCorrect: opts.isCorrect,
  });

  return {
    xpGained,
    newLevel,
    leveledUp,
    unlockedAchievements: unlocked,
    streak: newStreak,
    streakBonus,
  };
}

export async function recordActivity(opts: {
  type: string;
  skill?: string;
  title?: string;
  score?: number;
  xpEarned: number;
  correct?: number;
  total?: number;
  durationSec?: number;
  metadata?: unknown;
}): Promise<ApplyResult> {
  const profile = await getProfile();
  const today = todayStr();
  const yesterday = shiftDay(today, -1);

  let newStreak = profile.streak;
  if (profile.lastActivityDate !== today) {
    newStreak = profile.lastActivityDate === yesterday ? profile.streak + 1 : 1;
  }

  const newXp = profile.xp + opts.xpEarned;
  const newLevel = levelFromXp(newXp).level;
  const leveledUp = newLevel > profile.level;

  await db.userProfile.update({
    where: { id: profile.id },
    data: {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longestStreak: Math.max(profile.longestStreak, newStreak),
      lastActivityDate: today,
      dailyXpEarned: profile.dailyXpEarned + opts.xpEarned,
      dailyXpDate: today,
    },
  });

  await db.activityLog.create({
    data: {
      profileId: profile.id,
      type: opts.type,
      skill: opts.skill ?? null,
      title: opts.title ?? null,
      score: opts.score ?? null,
      xpEarned: opts.xpEarned,
      correct: opts.correct ?? null,
      total: opts.total ?? null,
      durationSec: opts.durationSec ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    },
  });

  await recomputeEstimatedScore(profile.id);

  const unlocked = await checkAchievements(profile.id, {
    totalQuestions: profile.totalQuestions,
    correctQuestions: profile.correctQuestions,
    streak: newStreak,
    level: newLevel,
    estimatedScore: (await db.userProfile.findUnique({ where: { id: profile.id } }))!.estimatedScore,
    skill: opts.skill,
    isCorrect: false,
  });

  return {
    xpGained: opts.xpEarned,
    newLevel,
    leveledUp,
    unlockedAchievements: unlocked,
    streak: newStreak,
    streakBonus: 0,
  };
}

async function updateWeakness(
  profileId: string,
  skill: string,
  subskill: string | undefined,
  isCorrect: boolean,
) {
  const existing = await db.weakness.findUnique({
    where: {
      profileId_skill_subskill: {
        profileId,
        skill,
        subskill: subskill ?? "",
      },
    },
  });
  if (existing) {
    await db.weakness.update({
      where: { id: existing.id },
      data: {
        errorCount: existing.errorCount + (isCorrect ? 0 : 1),
        totalCount: existing.totalCount + 1,
        lastSeen: new Date(),
      },
    });
  } else {
    await db.weakness.create({
      data: {
        profileId,
        skill,
        subskill: subskill ?? "",
        errorCount: isCorrect ? 0 : 1,
        totalCount: 1,
      },
    });
  }
}

/**
 * Approximate estimated TOEFL iBT score from accuracy + section coverage.
 * Pure heuristic (not the real TOEFL scaling) — used for motivation.
 */
export async function recomputeEstimatedScore(profileId: string) {
  const attempts = await db.questionAttempt.findMany({
    where: { profileId },
    select: { skill: true, isCorrect: true },
  });
  if (attempts.length < 5) {
    await db.userProfile.update({
      where: { id: profileId },
      data: { estimatedScore: 0 },
    });
    return;
  }

  const bySkill: Record<string, { total: number; correct: number }> = {};
  for (const a of attempts) {
    bySkill[a.skill] = bySkill[a.skill] || { total: 0, correct: 0 };
    bySkill[a.skill].total++;
    if (a.isCorrect) bySkill[a.skill].correct++;
  }

  const pct = (s: string) =>
    bySkill[s] && bySkill[s].total > 0
      ? bySkill[s].correct / bySkill[s].total
      : 0.5;

  // map reading / listening accuracy to 0-30
  const reading = Math.round(pct("reading") * 30);
  const listening = Math.round(pct("listening") * 30);
  // grammar/structure/vocabulary feed into a structural score (cap 30)
  const structural =
    ((pct("grammar") + pct("vocabulary") + pct("structure")) / 3) * 30;
  // speaking / writing use stored scores from AI evaluation; fallback 0
  const profile = await db.userProfile.findUnique({ where: { id: profileId } });
  const speaking = profile?.speakingScore ?? 0;
  const writing = profile?.writingScore ?? 0;

  const total = reading + listening + speaking + writing + Math.round(structural * 0);
  // Keep within plausible iBT range 0-120 but only count the 4 main sections.
  const cappedTotal = Math.min(
    120,
    Math.max(0, reading + listening + speaking + writing),
  );

  await db.userProfile.update({
    where: { id: profileId },
    data: {
      readingScore: reading,
      listeningScore: listening,
      speakingScore: speaking,
      writingScore: writing,
      estimatedScore: cappedTotal,
    },
  });
}

async function checkAchievements(
  profileId: string,
  ctx: {
    totalQuestions: number;
    correctQuestions: number;
    streak: number;
    level: number;
    estimatedScore: number;
    skill?: string;
    isCorrect: boolean;
  },
): Promise<string[]> {
  const unlocked: string[] = [];
  const all = await db.achievement.findMany();
  const links = await db.userAchievement.findMany({
    where: { profileId },
    include: { achievement: true },
  });

  // compute per-skill accuracy for mastery
  const attempts = await db.questionAttempt.findMany({
    where: { profileId },
    select: { skill: true, isCorrect: true },
  });
  const skillAcc: Record<string, number> = {};
  for (const a of attempts) {
    if (!skillAcc[a.skill]) skillAcc[a.skill] = 0;
  }
  const agg: Record<string, { t: number; c: number }> = {};
  for (const a of attempts) {
    agg[a.skill] = agg[a.skill] || { t: 0, c: 0 };
    agg[a.skill].t++;
    if (a.isCorrect) agg[a.skill].c++;
  }
  const acc = (s: string) => (agg[s] && agg[s].t ? (agg[s].c / agg[s].t) * 100 : 0);

  // count activities of each type
  const activities = await db.activityLog.findMany({
    where: { profileId },
    select: { type: true },
  });
  const quizCount = activities.filter((a) => a.type === "quiz").length;
  const writingCount = activities.filter((a) => a.type === "writing").length;
  const speakingCount = activities.filter((a) => a.type === "speaking").length;

  for (const def of ACHIEVEMENT_DEFS) {
    const link = links.find((l) => l.achievement.code === def.code);
    if (link?.unlocked) continue;
    let progress = 0;
    let done = false;
    switch (def.code) {
      case "first_quiz":
        progress = quizCount;
        done = quizCount >= 1;
        break;
      case "quiz_10":
        progress = quizCount;
        done = quizCount >= 10;
        break;
      case "quiz_50":
        progress = quizCount;
        done = quizCount >= 50;
        break;
      case "questions_100":
        progress = ctx.totalQuestions;
        done = ctx.totalQuestions >= 100;
        break;
      case "questions_500":
        progress = ctx.totalQuestions;
        done = ctx.totalQuestions >= 500;
        break;
      case "streak_3":
        progress = ctx.streak;
        done = ctx.streak >= 3;
        break;
      case "streak_7":
        progress = ctx.streak;
        done = ctx.streak >= 7;
        break;
      case "streak_30":
        progress = ctx.streak;
        done = ctx.streak >= 30;
        break;
      case "level_5":
        progress = ctx.level;
        done = ctx.level >= 5;
        break;
      case "level_10":
        progress = ctx.level;
        done = ctx.level >= 10;
        break;
      case "level_20":
        progress = ctx.level;
        done = ctx.level >= 20;
        break;
      case "score_60":
        progress = ctx.estimatedScore;
        done = ctx.estimatedScore >= 60;
        break;
      case "score_80":
        progress = ctx.estimatedScore;
        done = ctx.estimatedScore >= 80;
        break;
      case "score_100":
        progress = ctx.estimatedScore;
        done = ctx.estimatedScore >= 100;
        break;
      case "mastery_reading":
        progress = Math.round(acc("reading"));
        done = acc("reading") >= 80;
        break;
      case "mastery_listening":
        progress = Math.round(acc("listening"));
        done = acc("listening") >= 80;
        break;
      case "mastery_writing":
        progress = writingCount;
        done = writingCount >= 5;
        break;
      case "mastery_speaking":
        progress = speakingCount;
        done = speakingCount >= 5;
        break;
    }
    const achievement = all.find((a) => a.code === def.code)!;
    await db.userAchievement.upsert({
      where: {
        profileId_achievementId: { profileId, achievementId: achievement.id },
      },
      update: {
        progress: Math.max(link?.progress ?? 0, progress),
        unlocked: done ? true : link?.unlocked ?? false,
        unlockedAt: done && !link?.unlocked ? new Date() : link?.unlockedAt ?? null,
      },
      create: {
        profileId,
        achievementId: achievement.id,
        progress,
        unlocked: done,
        unlockedAt: done ? new Date() : null,
      },
    });
    if (done && !link?.unlocked) unlocked.push(def.code);
  }
  return unlocked;
}
