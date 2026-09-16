import type { AchievementDef, SkillKey, ViewKey } from "./types";

export const SKILLS: {
  key: SkillKey;
  label: string;
  icon: string;
  blurb: string;
  color: string;
  accent: string;
}[] = [
  {
    key: "reading",
    label: "Reading",
    icon: "BookOpen",
    blurb: "Passages, main ideas & inferences",
    color: "var(--skill-reading)",
    accent: "emerald",
  },
  {
    key: "listening",
    label: "Listening",
    icon: "Headphones",
    blurb: "Lectures, conversations & details",
    color: "var(--skill-listening)",
    accent: "teal",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: "Mic",
    blurb: "Independent & integrated tasks",
    color: "var(--skill-speaking)",
    accent: "amber",
  },
  {
    key: "writing",
    label: "Writing",
    icon: "PenLine",
    blurb: "Integrated & independent essays",
    color: "var(--skill-writing)",
    accent: "rose",
  },
  {
    key: "vocabulary",
    label: "Vocabulary",
    icon: "Languages",
    blurb: "Academic word power",
    color: "var(--skill-vocab)",
    accent: "violet",
  },
  {
    key: "grammar",
    label: "Grammar",
    icon: "SpellCheck",
    blurb: "Structure & written expression",
    color: "var(--skill-grammar)",
    accent: "orange",
  },
];

export const NAV_ITEMS: {
  key: ViewKey;
  label: string;
  icon: string;
  group: "learn" | "test" | "you" | "admin";
}[] = [
  { key: "dashboard", label: "Home", icon: "LayoutDashboard", group: "learn" },
  { key: "reading", label: "Reading", icon: "BookOpen", group: "learn" },
  { key: "listening", label: "Listening", icon: "Headphones", group: "learn" },
  { key: "speaking", label: "Speaking", icon: "Mic", group: "learn" },
  { key: "writing", label: "Writing", icon: "PenLine", group: "learn" },
  { key: "quiz", label: "Quiz", icon: "ListChecks", group: "test" },
  { key: "games", label: "Mini Games", icon: "Gamepad2", group: "test" },
  { key: "mock", label: "Mock Test", icon: "ClipboardCheck", group: "test" },
  { key: "progress", label: "Progress", icon: "TrendingUp", group: "you" },
  { key: "tutor", label: "AI Tutor", icon: "Sparkles", group: "you" },
  { key: "admin", label: "Admin", icon: "ShieldCheck", group: "admin" },
];

// Level curve: XP needed to reach next level grows gradually.
export function xpForLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.35));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

export function levelFromXp(xp: number): {
  level: number;
  intoLevel: number;
  neededForLevel: number;
  progressPct: number;
} {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const needed = xpForLevel(level);
  return {
    level,
    intoLevel: remaining,
    neededForLevel: needed,
    progressPct: Math.min(100, Math.round((remaining / needed) * 100)),
  };
}

export function levelTitle(level: number): string {
  if (level >= 25) return "Grandmaster";
  if (level >= 18) return "Master";
  if (level >= 12) return "Expert";
  if (level >= 7) return "Advanced";
  if (level >= 4) return "Intermediate";
  if (level >= 2) return "Apprentice";
  return "Beginner";
}

// XP rewards
export const XP_REWARDS = {
  correctAnswer: 12,
  correctHard: 20,
  correctEasy: 8,
  quizComplete: 30,
  gameComplete: 25,
  writingSubmission: 60,
  speakingSubmission: 50,
  mockComplete: 120,
  streakBonus: (streak: number) => Math.min(50, streak * 3),
  perfectSection: 40,
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Learning
  { code: "first_quiz", title: "First Steps", description: "Complete your first quiz", icon: "Footprints", category: "learning", threshold: 1, tier: "bronze" },
  { code: "quiz_10", title: "Quiz Cadet", description: "Complete 10 quizzes", icon: "ListChecks", category: "learning", threshold: 10, tier: "bronze" },
  { code: "quiz_50", title: "Quiz Champion", description: "Complete 50 quizzes", icon: "Trophy", category: "learning", threshold: 50, tier: "silver" },
  { code: "questions_100", title: "Centurion", description: "Answer 100 questions", icon: "Hash", category: "learning", threshold: 100, tier: "bronze" },
  { code: "questions_500", title: "Scholar", description: "Answer 500 questions", icon: "GraduationCap", category: "learning", threshold: 500, tier: "silver" },
  // Streak
  { code: "streak_3", title: "Getting Warmed Up", description: "Maintain a 3-day streak", icon: "Flame", category: "streak", threshold: 3, tier: "bronze" },
  { code: "streak_7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "Flame", category: "streak", threshold: 7, tier: "silver" },
  { code: "streak_30", title: "Unstoppable", description: "Maintain a 30-day streak", icon: "Flame", category: "streak", threshold: 30, tier: "gold" },
  // XP / Level
  { code: "level_5", title: "Rising Star", description: "Reach level 5", icon: "Star", category: "xp", threshold: 5, tier: "bronze" },
  { code: "level_10", title: "Dedicated", description: "Reach level 10", icon: "Star", category: "xp", threshold: 10, tier: "silver" },
  { code: "level_20", title: "Elite Learner", description: "Reach level 20", icon: "Award", category: "xp", threshold: 20, tier: "gold" },
  // Score
  { code: "score_60", title: "Test Ready", description: "Reach an estimated score of 60", icon: "Gauge", category: "score", threshold: 60, tier: "bronze" },
  { code: "score_80", title: "High Achiever", description: "Reach an estimated score of 80", icon: "Gauge", category: "score", threshold: 80, tier: "silver" },
  { code: "score_100", title: "Top Tier", description: "Reach an estimated score of 100", icon: "Crown", category: "score", threshold: 100, tier: "gold" },
  // Mastery (per-skill accuracy)
  { code: "mastery_reading", title: "Reading Master", description: "Reach 80% accuracy in Reading", icon: "BookOpen", category: "mastery", threshold: 80, tier: "gold" },
  { code: "mastery_listening", title: "Listening Master", description: "Reach 80% accuracy in Listening", icon: "Headphones", category: "mastery", threshold: 80, tier: "gold" },
  { code: "mastery_writing", title: "Writing Master", description: "Submit 5 writing tasks", icon: "PenLine", category: "mastery", threshold: 5, tier: "silver" },
  { code: "mastery_speaking", title: "Speaking Master", description: "Submit 5 speaking tasks", icon: "Mic", category: "mastery", threshold: 5, tier: "silver" },
];

export const TOEFL_TIPS = [
  "Skim the passage first, then read the questions. Return for details.",
  "In Listening, take notes on key terms, examples and transitions.",
  "For Speaking, structure your answer: opinion → reason → example → conclusion.",
  "Independent essays: pick one side and defend it with two strong reasons.",
  "Watch signal words: 'however', 'therefore', 'in contrast' — they reveal the author's logic.",
  "Practice typing full essays under 30 minutes to build stamina.",
  "Vocabulary in context: guess meaning from surrounding sentences first.",
  "Summarize lectures out loud to train both listening and speaking.",
];

export const DAILY_GOALS = [
  { id: "goal-questions", label: "Answer 10 questions", target: 10, xp: 30 },
  { id: "goal-xp", label: "Earn 80 XP", target: 80, xp: 20 },
  { id: "goal-streak", label: "Keep your streak alive", target: 1, xp: 25 },
];
