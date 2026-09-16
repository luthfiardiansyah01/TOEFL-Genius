// Shared types for the TOEFL Learning App

export type ViewKey =
  | "dashboard"
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "quiz"
  | "games"
  | "mock"
  | "progress"
  | "tutor";

export type SkillKey =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "vocabulary"
  | "grammar";

export type Difficulty = "easy" | "medium" | "hard";

export interface ChoiceQuestion {
  id: string;
  skill: SkillKey;
  subskill?: string;
  difficulty: Difficulty;
  passage?: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuizSet {
  id: string;
  title: string;
  skill: SkillKey;
  difficulty: Difficulty;
  passage?: string;
  questions: ChoiceQuestion[];
}

export interface EvaluateResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  subskill?: string;
  xpEarned: number;
}

export interface WritingEvaluation {
  score: number; // 0-30 (TOEFL iBT writing scale)
  band: string; // e.g. "High", "Fair", "Limited"
  feedback: string;
  strengths: string[];
  improvements: string[];
  correctedExcerpt?: string;
}

export interface SpeakingEvaluation {
  score: number; // 0-30
  band: string;
  transcript: string;
  feedback: string;
  pronunciation: number; // 0-100
  fluency: number; // 0-100
  grammar: number; // 0-100
  suggestions: string[];
}

export interface ProgressData {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  estimatedScore: number;
  readingScore: number;
  listeningScore: number;
  speakingScore: number;
  writingScore: number;
  dailyGoalXp: number;
  dailyXpEarned: number;
  name: string;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  skill?: string;
  title?: string;
  score?: number;
  xpEarned: number;
  correct?: number;
  total?: number;
  createdAt: string;
}

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: "learning" | "streak" | "score" | "xp" | "mastery";
  threshold: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface WeaknessItem {
  skill: string;
  subskill?: string;
  errorCount: number;
  totalCount: number;
  errorRate: number;
}

export interface Recommendation {
  skill: SkillKey;
  activity: "reading" | "quiz" | "writing" | "speaking" | "listening" | "games";
  difficulty: Difficulty;
  title: string;
  reason: string;
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MockTestSection {
  type: "reading" | "listening" | "structure";
  title: string;
  questions: ChoiceQuestion[];
}

export interface MockTest {
  id: string;
  sections: MockTestSection[];
  totalQuestions: number;
}

export interface VocabGameItem {
  word: string;
  meaning: string;
  distractors: string[];
}
