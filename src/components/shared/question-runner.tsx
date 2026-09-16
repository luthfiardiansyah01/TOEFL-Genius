"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChoiceQuestion, QuizSet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProgress } from "@/hooks/use-progress";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  quiz: QuizSet;
  accent?: string; // css color var name
  passageSideBySide?: boolean; // reading layout
  onComplete?: (summary: { correct: number; total: number; xp: number }) => void;
  onRestart?: () => void;
  restartLabel?: string;
  busyRestart?: boolean;
}

export function QuestionRunner({
  quiz,
  accent = "var(--primary)",
  passageSideBySide = false,
  onComplete,
  onRestart,
  restartLabel = "New set",
  busyRestart,
}: Props) {
  const { celebrate } = useProgress();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<
    Record<string, { isCorrect: boolean; xpGained: number; explanation: string; correctAnswer: string }>
  >({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const answeredCount = Object.keys(results).length;
  const total = quiz.questions.length;
  const correctCount = Object.values(results).filter((r) => r.isCorrect).length;
  const xpEarned = Object.values(results).reduce((s, r) => s + r.xpGained, 0);
  const allAnswered = answeredCount === total;

  async function selectAnswer(q: ChoiceQuestion, idx: number) {
    if (results[q.id]) return;
    setAnswers((a) => ({ ...a, [q.id]: idx }));
    setPendingId(q.id);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, selectedIndex: idx }),
      });
      const data = await res.json();
      setResults((r) => ({
        ...r,
        [q.id]: {
          isCorrect: data.isCorrect,
          xpGained: data.xpGained ?? 0,
          explanation: data.explanation ?? "",
          correctAnswer: data.correctAnswer ?? q.choices[q.answerIndex],
        },
      }));
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });
      // check completion
      if (Object.keys(results).length + 1 === total) {
        const newCorrect =
          correctCount + (data.isCorrect ? 1 : 0);
        const newXp = xpEarned + (data.xpGained ?? 0);
        onComplete?.({ correct: newCorrect, total, xp: newXp });
      }
    } catch {
      // ignore; user can retry
    } finally {
      setPendingId(null);
    }
  }

  const passage = quiz.passage;

  return (
    <div className="flex flex-col gap-4">
      {/* Passage */}
      {passage && (
        <div
          className={cn(
            "rounded-3xl border border-border bg-card p-4 sm:p-5",
            passageSideBySide && "lg:p-5",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon name="BookOpen" className="size-3.5" />
            {quiz.title}
          </div>
          <ScrollArea
            className={cn(
              "pr-3 scroll-area-thin",
              passageSideBySide
                ? "h-[420px] text-[15px] leading-relaxed"
                : "max-h-72 text-sm leading-relaxed",
            )}
          >
            <p className="whitespace-pre-wrap">{passage}</p>
          </ScrollArea>
        </div>
      )}

      {/* Questions */}
      <div className="flex flex-col gap-3">
        {quiz.questions.map((q, qi) => {
          const res = results[q.id];
          const selected = answers[q.id];
          return (
            <article
              key={q.id}
              className="rounded-3xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-start gap-2">
                <span
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                  style={{ background: accent }}
                >
                  {qi + 1}
                </span>
                <p className="text-[15px] font-medium leading-snug">{q.prompt}</p>
              </div>
              <div className="grid gap-2">
                {q.choices.map((c, ci) => {
                  const isSel = selected === ci;
                  const isCorrect = ci === q.answerIndex;
                  const reveal = !!res;
                  let state: "idle" | "sel" | "correct" | "wrong" = "idle";
                  if (reveal) {
                    if (isCorrect) state = "correct";
                    else if (isSel) state = "wrong";
                  } else if (isSel) state = "sel";
                  return (
                    <button
                      key={ci}
                      disabled={!!res || pendingId === q.id}
                      onClick={() => selectAnswer(q, ci)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                        state === "idle" &&
                          "border-border bg-background hover:border-primary/50 hover:bg-accent",
                        state === "sel" &&
                          "border-primary bg-primary/5",
                        state === "correct" &&
                          "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        state === "wrong" &&
                          "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                          state === "correct"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : state === "wrong"
                              ? "border-rose-500 bg-rose-500 text-white"
                              : "border-border",
                        )}
                      >
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <span className="flex-1">{c}</span>
                      {state === "correct" && (
                        <Icon name="CheckCircle2" className="size-4" />
                      )}
                      {state === "wrong" && (
                        <Icon name="XCircle" className="size-4" />
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {res && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        "mt-3 rounded-2xl border p-3 text-sm",
                        res.isCorrect
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-rose-500/30 bg-rose-500/5",
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                        {res.isCorrect ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Correct · +{res.xpGained} XP
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            Not quite · +{res.xpGained} XP
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-foreground/90">
                        {res.explanation}
                      </p>
                      {!res.isCorrect && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Correct answer:{" "}
                          <span className="font-semibold text-foreground">
                            {res.correctAnswer}
                          </span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>

      {/* Summary + restart */}
      {allAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Set complete
          </p>
          <p className="mt-1 text-3xl font-extrabold">
            {correctCount}/{total}
          </p>
          <p className="text-sm text-muted-foreground">
            +{xpEarned} XP earned ·{" "}
            {Math.round((correctCount / total) * 100)}% accuracy
          </p>
          {onRestart && (
            <Button
              onClick={onRestart}
              disabled={busyRestart}
              className="mt-4 rounded-full"
            >
              {busyRestart ? (
                <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
              ) : (
                <Icon name="RefreshCw" className="mr-2 size-4" />
              )}
              {restartLabel}
            </Button>
          )}
        </motion.div>
      )}

      {!allAnswered && pendingId && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Icon name="Loader2" className="size-4 animate-spin" />
          Checking your answer…
        </div>
      )}
    </div>
  );
}

export function QuizSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}
