"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { ACHIEVEMENT_DEFS } from "@/lib/constants";

export interface ProgressPayload {
  progress: import("@/lib/types").ProgressData;
  intoLevel: number;
  neededForLevel: number;
  levelProgressPct: number;
  activities: import("@/lib/types").ActivityFeedItem[];
  weaknesses: import("@/lib/types").WeaknessItem[];
  achievements: Array<{
    code: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    tier: string;
    threshold: number;
    progress: number;
    unlocked: boolean;
    unlockedAt: string | null;
  }>;
  accuracyBySkill: Array<{ skill: string; total: number; correct: number; accuracy: number }>;
  xpHistory: Array<{ date: string; xp: number }>;
  recommendation: import("@/lib/types").Recommendation | null;
}

async function fetchProgress(): Promise<ProgressPayload> {
  const res = await fetch("/api/progress", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load progress");
  return res.json();
}

export function useProgress() {
  const setProgress = useAppStore((s) => s.setProgress);
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const query = useQuery<ProgressPayload>({
    queryKey: ["progress"],
    queryFn: fetchProgress,
    refetchInterval: false,
  });

  useEffect(() => {
    if (query.data) setProgress(query.data.progress);
  }, [query.data, setProgress]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["progress"] });

  /** Fire-and-forget celebration toasts based on a server response. */
  function celebrate(payload: {
    xpGained?: number;
    leveledUp?: boolean;
    newLevel?: number;
    unlockedAchievements?: string[];
    streak?: number;
    streakBonus?: number;
  }) {
    if (payload.xpGained && payload.xpGained > 0) {
      pushToast({
        id: `xp_${Date.now()}_${Math.random()}`,
        kind: "xp",
        title: `+${payload.xpGained} XP`,
        description: payload.streakBonus
          ? `Includes ${payload.streakBonus} streak bonus`
          : undefined,
      });
    }
    if (payload.streak && payload.streak >= 2) {
      pushToast({
        id: `streak_${Date.now()}`,
        kind: "streak",
        title: `${payload.streak}-day streak!`,
        description: "Keep practicing daily to grow your streak.",
      });
    }
    if (payload.leveledUp && payload.newLevel) {
      pushToast({
        id: `lvl_${Date.now()}`,
        kind: "levelup",
        title: `Level ${payload.newLevel} reached!`,
        description: "New challenges and rewards unlocked.",
      });
    }
    if (payload.unlockedAchievements?.length) {
      for (const code of payload.unlockedAchievements) {
        const def = ACHIEVEMENT_DEFS.find((a) => a.code === code);
        pushToast({
          id: `ach_${code}_${Date.now()}`,
          kind: "achievement",
          title: def?.title ?? "Achievement unlocked!",
          description: def?.description,
          icon: def?.icon,
        });
      }
    }
    invalidate();
  }

  return { ...query, invalidate, celebrate };
}
