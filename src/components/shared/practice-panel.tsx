"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionRunner, QuizSkeleton } from "./question-runner";
import { SKILLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useProgress } from "@/hooks/use-progress";
import { XP_REWARDS } from "@/lib/constants";
import type { ChoiceQuestion, Difficulty, QuizSet, SkillKey } from "@/lib/types";

async function genQuiz(opts: {
  skill: SkillKey;
  difficulty: Difficulty;
  count: number;
  topic?: string;
}): Promise<QuizSet> {
  const res = await fetch("/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to generate questions");
  }
  const data = await res.json();
  const questions: ChoiceQuestion[] = (data.questions || []).map(
    (q: ChoiceQuestion, i: number) => ({ ...q, id: q.id || `q_${Date.now()}_${i}` }),
  );
  return {
    id: data.id,
    title: data.title,
    skill: opts.skill,
    difficulty: opts.difficulty,
    passage: data.passage,
    questions,
  };
}

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

interface Props {
  skill: SkillKey;
  title: string;
  subtitle: string;
  accent?: string;
  allowSkillChange?: boolean;
  showTopic?: boolean;
  passageLayout?: boolean;
  defaultDifficulty?: Difficulty;
  count?: number;
}

export function PracticePanel({
  skill: initialSkill,
  title,
  subtitle,
  accent = "var(--primary)",
  allowSkillChange = false,
  showTopic = false,
  passageLayout = false,
  defaultDifficulty = "medium",
  count = 4,
}: Props) {
  const [skill, setSkill] = useState<SkillKey>(initialSkill);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [topic, setTopic] = useState("");
  const { celebrate } = useProgress();

  const query = useQuery<QuizSet, Error>({
    queryKey: ["quiz", skill, difficulty, topic, count, initialSkill],
    queryFn: () => genQuiz({ skill, difficulty, count, topic: topic || undefined }),
    enabled: false,
  });

  const generate = useCallback(() => {
    query.refetch();
  }, [query]);

  const skillDef = SKILLS.find((s) => s.key === skill)!;

  const handleComplete = useCallback(
    async (summary: { correct: number; total: number; xp: number }) => {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: skill === "vocabulary" || skill === "grammar" ? "quiz" : skill,
          skill,
          title: title,
          score: Math.round((summary.correct / summary.total) * 100),
          xpEarned: XP_REWARDS.quizComplete,
          correct: summary.correct,
          total: summary.total,
        }),
      });
      const data = await res.json().catch(() => ({}));
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });
    },
    [skill, title, celebrate],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: skillDef.color }}
        >
          <Icon name={skillDef.icon} className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      {/* Controls */}
      <div className="rounded-3xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {allowSkillChange && (
            <div className="flex flex-wrap gap-1">
              {SKILLS.filter((s) =>
                ["reading", "listening", "vocabulary", "grammar"].includes(s.key),
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSkill(s.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    skill === s.key
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                  style={skill === s.key ? { background: s.color } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  difficulty === d.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {showTopic && (
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Optional topic (e.g. marine biology)"
              className="h-8 flex-1 min-w-40 text-xs"
            />
          )}
          <Button
            onClick={generate}
            disabled={query.isFetching}
            size="sm"
            className="ml-auto rounded-full"
          >
            {query.isFetching ? (
              <Icon name="Loader2" className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Icon name="Sparkles" className="mr-1.5 size-3.5" />
            )}
            {query.data ? "New set" : "Generate"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {query.isFetching && <QuizSkeleton />}
      {!query.isFetching && query.error && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
          <Icon name="XCircle" className="mx-auto size-8 text-rose-500" />
          <p className="mt-2 text-sm font-semibold">Couldn't generate questions</p>
          <p className="text-xs text-muted-foreground">{query.error.message}</p>
          <Button onClick={generate} variant="outline" size="sm" className="mt-3 rounded-full">
            Try again
          </Button>
        </div>
      )}
      {!query.isFetching && query.data && query.data.questions.length > 0 && (
        <QuestionRunner
          key={query.data.id}
          quiz={query.data}
          accent={accent}
          passageSideBySide={passageLayout}
          onComplete={handleComplete}
          onRestart={generate}
          busyRestart={query.isFetching}
        />
      )}
      {!query.isFetching && !query.data && !query.error && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center">
          <span
            className="grid size-14 place-items-center rounded-2xl text-white"
            style={{ background: skillDef.color }}
          >
            <Icon name={skillDef.icon} className="size-7" />
          </span>
          <div>
            <p className="text-sm font-semibold">Ready when you are</p>
            <p className="text-xs text-muted-foreground">
              Tap generate and GLM-5.3 will craft {count} {skill} questions for you.
            </p>
          </div>
          <Button onClick={generate} className="rounded-full">
            <Icon name="Sparkles" className="mr-1.5 size-4" />
            Generate questions
          </Button>
        </div>
      )}
    </div>
  );
}
