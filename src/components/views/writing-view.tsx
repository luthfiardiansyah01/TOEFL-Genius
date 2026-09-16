"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Ring } from "@/components/shared/ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgress } from "@/hooks/use-progress";
import { cn } from "@/lib/utils";
import type { WritingEvaluation } from "@/lib/types";

const ACCENT = "var(--skill-writing)";

const INDEPENDENT_PROMPTS = [
  "Do you agree or disagree with the following statement? It is better to work in a team than to work alone. Use specific reasons and examples to support your answer.",
  "Some people believe that university education should be free for everyone. Others believe that students should pay for their own education. Which view do you agree with? Use specific reasons and examples.",
  "Do you agree or disagree with the following statement? Technology has made children less creative than they were in the past. Use specific reasons and examples to support your answer.",
  "Some people prefer to live in a small town. Others prefer to live in a big city. Which place would you prefer to live in? Use specific reasons and details to support your answer.",
  "Do you agree or disagree with the following statement? Successful people try new things and take risks rather than only doing what they already know how to do. Use specific reasons and examples to support your answer.",
];

const INTEGRATED_PROMPTS: {
  reading: string;
  lecture: string;
  prompt: string;
}[] = [
  {
    reading:
      "Group work is widely regarded as an effective teaching strategy in modern education. Proponents argue that collaborative projects teach students essential interpersonal skills such as communication, negotiation, and conflict resolution. Furthermore, group assignments allow students to tackle more complex problems than they could handle individually, mirroring the team-based structure of most professional workplaces. Schools are therefore encouraged to integrate cooperative learning throughout the curriculum.",
    lecture:
      "While group work sounds appealing in theory, in practice it often falls short. The most common problem is the unequal distribution of effort — typically, one or two motivated students end up doing the majority of the work while others contribute very little but receive the same grade. This 'free-rider' problem creates resentment and reduces motivation for high-achieving students. Additionally, the supposed communication skills rarely develop because dominant personalities tend to take over, silencing quieter members. Rather than reflecting real workplace dynamics, classroom groups frequently model their failure modes. A more honest approach would combine individual accountability with occasional collaborative tasks, ensuring every student's contribution is measured and rewarded.",
    prompt:
      "Summarize the points made in the lecture, explaining how they cast doubt on the claims made in the reading passage about the benefits of group work in education.",
  },
];

const TIMER_SECONDS = 30 * 60; // 30 minutes
const MIN_ESSAY_CHARS = 20;

type TaskType = "independent" | "integrated";

export function WritingView() {
  const { celebrate } = useProgress();
  const [taskType, setTaskType] = useState<TaskType>("independent");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: ACCENT }}
        >
          <Icon name="PenLine" className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Writing Practice
          </h1>
          <p className="text-xs text-muted-foreground">
            Write your essay and get a TOEFL-style score from GLM-5.3.
          </p>
        </div>
      </header>

      <Tabs
        value={taskType}
        onValueChange={(v) => setTaskType(v as TaskType)}
        className="gap-3"
      >
        <TabsList className="h-9 rounded-full p-1">
          <TabsTrigger
            value="independent"
            className="rounded-full data-[state=active]:text-white"
            style={
              taskType === "independent"
                ? { background: ACCENT }
                : undefined
            }
          >
            Independent
          </TabsTrigger>
          <TabsTrigger
            value="integrated"
            className="rounded-full data-[state=active]:text-white"
            style={
              taskType === "integrated" ? { background: ACCENT } : undefined
            }
          >
            Integrated
          </TabsTrigger>
        </TabsList>
        <TabsContent value="independent" className="outline-none">
          <IndependentTask key="ind" celebrate={celebrate} />
        </TabsContent>
        <TabsContent value="integrated" className="outline-none">
          <IntegratedTask key="int" celebrate={celebrate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TaskProps {
  celebrate: ReturnType<typeof useProgress>["celebrate"];
}

function IndependentTask({ celebrate }: TaskProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const prompt = INDEPENDENT_PROMPTS[promptIndex];

  function shufflePrompt() {
    if (INDEPENDENT_PROMPTS.length <= 1) return;
    let next = promptIndex;
    while (next === promptIndex) {
      next = Math.floor(Math.random() * INDEPENDENT_PROMPTS.length);
    }
    setPromptIndex(next);
    resetAll();
  }

  function resetAll() {
    setEssay("");
    setResult(null);
    setError(null);
    setSecondsLeft(TIMER_SECONDS);
    setTimerStarted(false);
  }

  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<WritingEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Run the countdown only while writing and not yet submitted.
  useEffect(() => {
    if (!timerStarted || result) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStarted, result]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const canSubmit = essay.trim().length >= MIN_ESSAY_CHARS && !submitting;

  function onEssayChange(value: string) {
    if (result) return; // lock after grading
    setEssay(value);
    if (!timerStarted && value.length > 0) setTimerStarted(true);
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/writing/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          essay,
          taskType: "independent",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not grade your essay.");
      }
      const evalData = data.evaluation as WritingEvaluation;
      setResult(evalData);
      if (timerRef.current) clearInterval(timerRef.current);
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TaskLayout
      prompt={prompt}
      onShuffle={shufflePrompt}
      essay={essay}
      onEssayChange={onEssayChange}
      wordCount={wordCount}
      secondsLeft={secondsLeft}
      timerStarted={timerStarted}
      canSubmit={canSubmit}
      submitting={submitting}
      onSubmit={submit}
      error={error}
      result={result}
      onReset={resetAll}
      passageBlock={null}
      shuffleLabel="New prompt"
    />
  );
}

function IntegratedTask({ celebrate }: TaskProps) {
  const sample = INTEGRATED_PROMPTS[0];
  const prompt = sample.prompt;

  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<WritingEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!timerStarted || result) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStarted, result]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const canSubmit = essay.trim().length >= MIN_ESSAY_CHARS && !submitting;

  function onEssayChange(value: string) {
    if (result) return;
    setEssay(value);
    if (!timerStarted && value.length > 0) setTimerStarted(true);
  }

  function resetAll() {
    setEssay("");
    setResult(null);
    setError(null);
    setSecondsLeft(TIMER_SECONDS);
    setTimerStarted(false);
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/writing/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          essay,
          taskType: "integrated",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not grade your essay.");
      }
      const evalData = data.evaluation as WritingEvaluation;
      setResult(evalData);
      if (timerRef.current) clearInterval(timerRef.current);
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const passageBlock = (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Icon name="BookOpen" className="size-3.5" />
          Reading passage
        </p>
        <ScrollArea className="max-h-48 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/90">
          <p className="whitespace-pre-wrap">{sample.reading}</p>
        </ScrollArea>
      </div>
      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Icon name="Headphones" className="size-3.5" />
          Lecture transcript
        </p>
        <ScrollArea className="max-h-48 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/90">
          <p className="whitespace-pre-wrap">{sample.lecture}</p>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <TaskLayout
      prompt={prompt}
      onShuffle={undefined}
      essay={essay}
      onEssayChange={onEssayChange}
      wordCount={wordCount}
      secondsLeft={secondsLeft}
      timerStarted={timerStarted}
      canSubmit={canSubmit}
      submitting={submitting}
      onSubmit={submit}
      error={error}
      result={result}
      onReset={resetAll}
      passageBlock={passageBlock}
      shuffleLabel={undefined}
    />
  );
}

interface LayoutProps {
  prompt: string;
  onShuffle?: () => void;
  shuffleLabel?: string;
  essay: string;
  onEssayChange: (v: string) => void;
  wordCount: number;
  secondsLeft: number;
  timerStarted: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  result: WritingEvaluation | null;
  onReset: () => void;
  passageBlock: React.ReactNode;
}

function TaskLayout({
  prompt,
  onShuffle,
  shuffleLabel,
  essay,
  onEssayChange,
  wordCount,
  secondsLeft,
  timerStarted,
  canSubmit,
  submitting,
  onSubmit,
  error,
  result,
  onReset,
  passageBlock,
}: LayoutProps) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const timePct = (secondsLeft / TIMER_SECONDS) * 100;
  const timeColor =
    secondsLeft <= 60
      ? "text-rose-500"
      : secondsLeft <= 300
        ? "text-amber-500"
        : "text-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {passageBlock}

      {/* Prompt card */}
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Icon name="Quote" className="size-3.5" />
            Writing prompt
          </span>
          {onShuffle && (
            <Button
              onClick={onShuffle}
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2 text-[11px]"
              disabled={submitting}
            >
              <Icon name="RefreshCw" className="mr-1 size-3" />
              {shuffleLabel}
            </Button>
          )}
        </div>
        <p className="text-[15px] font-medium leading-snug sm:text-base">
          {prompt}
        </p>
      </Card>

      {/* Editor card */}
      <Card className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon name="PenLine" className="size-3.5" />
            Your essay
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={cn(
                "tabular-nums font-semibold",
                timerStarted && !result && timeColor,
              )}
            >
              <Icon name="Clock" className="mr-1 inline size-3.5" />
              {mm}:{ss}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {wordCount} words
            </span>
          </div>
        </div>
        {timerStarted && !result && (
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${timePct}%`,
                background:
                  secondsLeft <= 60
                    ? "var(--destructive)"
                    : secondsLeft <= 300
                      ? "var(--skill-speaking)"
                      : ACCENT,
              }}
            />
          </div>
        )}
        <Textarea
          value={essay}
          onChange={(e) => onEssayChange(e.target.value)}
          placeholder="Write your essay here…"
          disabled={submitting || !!result}
          className="min-h-[280px] resize-y rounded-2xl text-[15px] leading-relaxed"
        />
        {!result && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {essay.trim().length < MIN_ESSAY_CHARS
                ? `Write at least ${MIN_ESSAY_CHARS} characters to submit.`
                : "Ready to submit for AI grading."}
            </p>
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="rounded-full"
              style={canSubmit ? { background: ACCENT } : undefined}
            >
              {submitting ? (
                <Icon name="Loader2" className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Icon name="Send" className="mr-1.5 size-4" />
              )}
              {submitting ? "Grading…" : "Submit for AI grading"}
            </Button>
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-2.5 text-xs text-rose-600 dark:text-rose-300">
            <Icon name="XCircle" className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={onSubmit}
              className="rounded-full border border-rose-500/40 px-2 py-0.5 font-semibold hover:bg-rose-500/10"
            >
              Retry
            </button>
          </div>
        )}
      </Card>

      {/* Loading skeleton while grading */}
      {submitting && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="Sparkles" className="size-4 animate-pulse" />
            GLM-5.3 is grading your essay…
          </div>
          <Skeleton className="h-32 rounded-2xl" />
        </Card>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <WritingResultCard evaluation={result} essay={essay} />
            <div className="flex justify-center">
              <Button onClick={onReset} className="rounded-full">
                <Icon name="RefreshCw" className="mr-2 size-4" />
                Try another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WritingResultCard({
  evaluation: ev,
  essay,
}: {
  evaluation: WritingEvaluation;
  essay: string;
}) {
  const score = Math.max(0, Math.min(30, ev.score ?? 0));
  const pct = (score / 30) * 100;
  return (
    <Card className="p-4 sm:p-5">
      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4">
          <Ring value={pct} size={120} stroke={11} barClass="text-rose-500">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Score
              </p>
              <p className="text-3xl font-extrabold leading-none">{score}</p>
              <p className="text-[10px] text-muted-foreground">/ 30</p>
            </div>
          </Ring>
          <div className="sm:hidden">
            <p className="text-xs text-muted-foreground">TOEFL-style score</p>
            <p className="text-sm font-semibold">From your essay</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-full"
              style={{
                background:
                  "color-mix(in oklch, var(--skill-writing) 18%, transparent)",
                color: "var(--skill-writing)",
              }}
            >
              {ev.band || "—"}
            </Badge>
            <span className="text-xs text-muted-foreground">Band rating</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {ev.feedback}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ev.strengths?.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <Icon name="CheckCircle2" className="size-3.5" />
              Strengths
            </p>
            <ul className="flex flex-col gap-1.5">
              {ev.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Icon
                    name="CheckCircle2"
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                  />
                  <span className="flex-1 leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ev.improvements?.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Icon name="Lightbulb" className="size-3.5" />
              Improvements
            </p>
            <ul className="flex flex-col gap-1.5">
              {ev.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Icon
                    name="Lightbulb"
                    className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                  />
                  <span className="flex-1 leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {ev.correctedExcerpt && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Icon name="Pencil" className="size-3.5" />
            Corrected excerpt
          </p>
          <div className="rounded-2xl border border-border bg-background p-3">
            <ScrollArea className="max-h-72 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/90">
              <p className="whitespace-pre-wrap">{ev.correctedExcerpt}</p>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Original essay collapsed for reference */}
      <details className="mt-3 group">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          <Icon name="BookMarked" className="size-3.5" />
          Show your original essay
        </summary>
        <div className="mt-2 rounded-2xl border border-border bg-muted/40 p-3">
          <ScrollArea className="max-h-60 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/80">
            <p className="whitespace-pre-wrap">{essay}</p>
          </ScrollArea>
        </div>
      </details>
    </Card>
  );
}

export function WritingViewSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-12 w-72 rounded-2xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}
