"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProgress } from "@/hooks/use-progress";
import { XP_REWARDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChoiceQuestion, Difficulty, QuizSet } from "@/lib/types";

const ACCENT = "var(--skill-listening)";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const SPEEDS = [0.75, 1, 1.25] as const;
type Speed = (typeof SPEEDS)[number];

async function genListeningQuiz(opts: {
  difficulty: Difficulty;
  topic?: string;
}): Promise<QuizSet> {
  const res = await fetch("/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skill: "listening",
      difficulty: opts.difficulty,
      count: 3,
      topic: opts.topic,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to generate listening set");
  }
  const data = await res.json();
  const questions: ChoiceQuestion[] = (data.questions || []).map(
    (q: ChoiceQuestion, i: number) => ({
      ...q,
      id: q.id || `lst_${Date.now()}_${i}`,
    }),
  );
  return {
    id: data.id,
    title: data.title,
    skill: "listening",
    difficulty: opts.difficulty,
    passage: data.passage,
    questions,
  };
}

interface QResult {
  isCorrect: boolean;
  xpGained: number;
  explanation: string;
  correctAnswer: string;
}

export function ListeningView() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [topic, setTopic] = useState("");
  const { celebrate } = useProgress();

  const query = useQuery<QuizSet, Error>({
    queryKey: ["listening-quiz", difficulty, topic],
    queryFn: () => genListeningQuiz({ difficulty, topic: topic || undefined }),
    enabled: false,
  });

  const generate = useCallback(() => {
    query.refetch();
  }, [query]);

  const quiz = query.data;

  // ---- TTS audio ----
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [progressPct, setProgressPct] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!quiz?.passage) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setAudioLoading(true);
    setAudioError(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setProgressPct(0);

    (async () => {
      try {
        const res = await fetch("/api/listening/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: quiz.passage, speed }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || "Audio generation failed");
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setAudioError(e instanceof Error ? e.message : "Audio failed");
        }
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [quiz?.id]);

  // Apply playback rate instantly when speed changes.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, audioUrl]);

  // Reset reveal + question state on new quiz.
  useEffect(() => {
    setShowTranscript(false);
    setAnswers({});
    setResults({});
    setPendingId(null);
    setProgressPct(0);
    setIsPlaying(false);
  }, [quiz?.id]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  // ---- Questions state ----
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, QResult>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const total = quiz?.questions.length ?? 0;
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.isCorrect).length;
  const xpEarned = Object.values(results).reduce((s, r) => s + r.xpGained, 0);
  const allAnswered = total > 0 && answeredCount === total;

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
      const result: QResult = {
        isCorrect: !!data.isCorrect,
        xpGained: data.xpGained ?? 0,
        explanation: data.explanation ?? "",
        correctAnswer: data.correctAnswer ?? q.choices[q.answerIndex],
      };
      setResults((r) => ({ ...r, [q.id]: result }));
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });

      // Final answer of the set → log the activity for completion bonus + history.
      if (answeredCount + 1 === total) {
        try {
          const newCorrect = correctCount + (result.isCorrect ? 1 : 0);
          const activityRes = await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "listening",
              skill: "listening",
              title: "Listening Practice",
              score: Math.round((newCorrect / total) * 100),
              xpEarned: XP_REWARDS.quizComplete,
              correct: newCorrect,
              total,
            }),
          });
          const activityData = await activityRes.json().catch(() => ({}));
          celebrate({
            xpGained: activityData.xpGained,
            leveledUp: activityData.leveledUp,
            newLevel: activityData.newLevel,
            unlockedAchievements: activityData.unlockedAchievements,
            streak: activityData.streak,
            streakBonus: activityData.streakBonus,
          });
        } catch {
          // Activity logging is best-effort.
        }
      }
    } catch {
      // Allow the user to retry the same question.
      setAnswers((a) => {
        const next = { ...a };
        delete next[q.id];
        return next;
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: ACCENT }}
        >
          <Icon name="Headphones" className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Listening Practice
          </h1>
          <p className="text-xs text-muted-foreground">
            Listen to the audio, then answer.
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="rounded-3xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                disabled={query.isFetching}
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
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Optional topic (e.g. campus life)"
            className="h-8 min-w-40 flex-1 text-xs"
          />
          <Button
            onClick={generate}
            disabled={query.isFetching}
            size="sm"
            className="ml-auto rounded-full"
            style={{ background: ACCENT }}
          >
            {query.isFetching ? (
              <Icon name="Loader2" className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Icon name="Sparkles" className="mr-1.5 size-3.5" />
            )}
            {quiz ? "New set" : "Generate"}
          </Button>
        </div>
      </div>

      {/* Body */}
      {query.isFetching && <QuizSkeleton />}

      {!query.isFetching && query.error && (
        <ErrorCard
          message={query.error.message}
          onRetry={generate}
          retryLabel="Try again"
        />
      )}

      {!query.isFetching && !quiz && !query.error && (
        <EmptyState onGenerate={generate} accent={ACCENT} />
      )}

      {!query.isFetching && quiz && quiz.questions.length > 0 && (
        <motion.div
          key={quiz.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* Audio player */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon name="Volume2" className="size-3.5" />
              {quiz.title}
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: `color-mix(in oklch, ${ACCENT} 16%, transparent)`,
                  color: ACCENT,
                }}
              >
                {quiz.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Play button */}
              <button
                onClick={togglePlay}
                disabled={audioLoading || !!audioError}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-md transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: ACCENT }}
              >
                {audioLoading ? (
                  <Icon name="Loader2" className="size-6 animate-spin" />
                ) : isPlaying ? (
                  <Icon name="Pause" className="size-6" />
                ) : (
                  <Icon name="Play" className="size-6 translate-x-0.5" />
                )}
              </button>

              {/* Waveform / progress */}
              <div className="flex-1">
                <div className="mb-2 flex items-end gap-0.5 h-8">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const seed = (i * 37) % 100;
                    const base = 20 + (seed % 60);
                    const active = progressPct >= (i / 32) * 100;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-colors",
                          isPlaying && active && "animate-pulse",
                        )}
                        style={{
                          height: `${base}%`,
                          background: active
                            ? ACCENT
                            : "color-mix(in oklch, var(--muted-foreground) 30%, transparent)",
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {audioLoading
                      ? "Loading audio…"
                      : audioError
                        ? "Audio unavailable"
                        : isPlaying
                          ? "Playing"
                          : "Ready"}
                  </span>
                  <span className="tabular-nums">
                    {Math.round(progressPct)}%
                  </span>
                </div>
              </div>

              {/* Speed selector */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Speed
                </span>
                <div className="flex flex-col gap-0.5">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition",
                        speed === s
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                      style={
                        speed === s ? { background: ACCENT } : undefined
                      }
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl ?? undefined}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setProgressPct(0);
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) {
                  setProgressPct((el.currentTime / el.duration) * 100);
                }
              }}
              className="hidden"
            />

            {audioError && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-2.5 text-xs text-rose-600 dark:text-rose-300">
                <Icon name="XCircle" className="size-4 shrink-0" />
                <span className="flex-1">{audioError}</span>
                <button
                  onClick={() => generate()}
                  className="rounded-full border border-rose-500/40 px-2 py-0.5 font-semibold hover:bg-rose-500/10"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Reveal transcript */}
            <div className="mt-3 border-t border-border pt-3">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <Icon
                  name="BookOpen"
                  className="size-3.5"
                />
                {showTranscript ? "Hide transcript" : "Reveal transcript"}
              </button>
              <AnimatePresence initial={false}>
                {showTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <ScrollArea className="mt-2 max-h-60 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/90">
                      <p className="whitespace-pre-wrap">{quiz.passage}</p>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

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
                      style={{ background: ACCENT }}
                    >
                      {qi + 1}
                    </span>
                    <p className="text-[15px] font-medium leading-snug">
                      {q.prompt}
                    </p>
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
                            state === "sel" && "border-primary bg-primary/5",
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

          {/* Summary + new set */}
          {allAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border p-5 text-center"
              style={{
                background: `linear-gradient(135deg, color-mix(in oklch, ${ACCENT} 14%, transparent), color-mix(in oklch, ${ACCENT} 4%, transparent))`,
              }}
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
              <Button
                onClick={generate}
                disabled={query.isFetching}
                className="mt-4 rounded-full"
                size="sm"
              >
                {query.isFetching ? (
                  <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
                ) : (
                  <Icon name="RefreshCw" className="mr-2 size-4" />
                )}
                New set
              </Button>
            </motion.div>
          )}

          {!allAnswered && pendingId && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Icon name="Loader2" className="size-4 animate-spin" />
              Checking your answer…
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function QuizSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}

function EmptyState({
  onGenerate,
  accent,
}: {
  onGenerate: () => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center">
      <span
        className="grid size-14 place-items-center rounded-2xl text-white"
        style={{ background: accent }}
      >
        <Icon name="Headphones" className="size-7" />
      </span>
      <div>
        <p className="text-sm font-semibold">Ready when you are</p>
        <p className="text-xs text-muted-foreground">
          Tap generate and GLM-5.3 will craft a short listening passage and 3
          questions for you.
        </p>
      </div>
      <Button onClick={onGenerate} className="rounded-full">
        <Icon name="Sparkles" className="mr-1.5 size-4" />
        Generate audio
      </Button>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
      <Icon name="XCircle" className="mx-auto size-8 text-rose-500" />
      <p className="mt-2 text-sm font-semibold">Something went wrong</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="mt-3 rounded-full"
      >
        <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
        {retryLabel}
      </Button>
    </div>
  );
}
