"use client";

import { Icon } from "@/components/shared/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILLS } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

const META: Record<string, { title: string; subtitle: string; skill: string }> = {
  listening: { title: "Listening", subtitle: "Listen, take notes, answer.", skill: "listening" },
  speaking: { title: "Speaking", subtitle: "Record your response and get AI feedback.", skill: "speaking" },
  writing: { title: "Writing", subtitle: "Write your essay, get an instant TOEFL-style score.", skill: "writing" },
  games: { title: "Mini Games", subtitle: "Learn through play.", skill: "vocabulary" },
  mock: { title: "TOEFL Mock Test", subtitle: "A full simulation built by GLM-5.3.", skill: "grammar" },
  tutor: { title: "AI Tutor", subtitle: "Ask anything about TOEFL.", skill: "reading" },
};

export function ComingSoon({ view }: { view: string }) {
  const meta = META[view] ?? META.tutor;
  const skill = SKILLS.find((s) => s.key === meta.skill)!;
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: skill.color }}
        >
          <Icon name={skill.icon} className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">{meta.title}</h1>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
      </header>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center"
      >
        <div className="relative">
          <Skeleton className="size-16 rounded-2xl" />
          <span className="absolute inset-0 grid place-items-center">
            <Icon name="Loader2" className="size-7 animate-spin text-primary" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold">Loading this module…</p>
          <p className="text-xs text-muted-foreground">
            This feature is being prepared. Try Reading or Quick Quiz meanwhile.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("reading")}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Go to Reading
          </button>
          <button
            onClick={() => setView("dashboard")}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
