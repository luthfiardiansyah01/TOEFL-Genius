import { create } from "zustand";
import type { ViewKey, ProgressData } from "./types";

interface AppState {
  // navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // optimistic progress (mirrors server)
  progress: ProgressData | null;
  setProgress: (p: ProgressData) => void;

  // streak/level-up notifications queue
  toasts: ToastEvent[];
  pushToast: (t: ToastEvent) => void;
  dismissToast: (id: string) => void;
}

export interface ToastEvent {
  id: string;
  kind: "xp" | "levelup" | "achievement" | "streak" | "info";
  title: string;
  description?: string;
  icon?: string;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),

  progress: null,
  setProgress: (p) => set({ progress: p }),

  toasts: [],
  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, t].slice(-4) })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const DEFAULT_PROGRESS: ProgressData = {
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  totalQuestions: 0,
  correctQuestions: 0,
  accuracy: 0,
  estimatedScore: 0,
  readingScore: 0,
  listeningScore: 0,
  speakingScore: 0,
  writingScore: 0,
  dailyGoalXp: 80,
  dailyXpEarned: 0,
  name: "Learner",
};
