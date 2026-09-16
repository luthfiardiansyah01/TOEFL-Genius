"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/shared/ring";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useProgress } from "@/hooks/use-progress";
import { XP_REWARDS } from "@/lib/constants";
import { QuestionRunner } from "@/components/shared/question-runner";
import type { MockTest, MockTestSection, QuizSet } from "@/lib/types";

const ACCENT = "var(--skill-grammar)"; // orange

type Phase = "intro" | "running" | "results";

interface SectionResult {
  correct: number;
  total: number;
  xp: number;
  title: string;
  type: MockTestSection["type"];
}

const SECTION_META: Record<
  MockTestSection["type"],
  { icon: string; color: string; label: string }
> = {
  reading: { icon: "BookOpen", color: "var(--skill-reading)", label: "Reading" },
  listening: { icon: "Headphones", color: "var(--skill-listening)", label: "Listening" },
  structure: { icon: "SpellCheck", color: "var(--skill-grammar)", label: "Structure" },
};

async function fetchMockTest(): Promise<MockTest> {
  const res = await fetch("/api/mock-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections: 3 }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to build mock test");
  }
  return (await res.json()) as MockTest;
}

function sectionToQuizSet(section: MockTestSection, hidePassage = false): QuizSet {
  const skill = section.type === "reading" ? "reading" : section.type === "listening" ? "listening" : "grammar";
  return {
    id: `${section.title}-${section.type}`,
    title: section.title,
    skill,
    difficulty: "medium",
    passage: hidePassage ? undefined : section.questions[0]?.passage,
    questions: section.questions.map((q, i) => ({
      ...q,
      id: q.id || `${section.title}-q${i}`,
    })),
  };
}

export function MockTestView() {
  const setView = useAppStore((s) => s.setView);
  const { celebrate } = useProgress();

  const [phase, setPhase] = useState<Phase>("intro");
  const [test, setTest] = useState<MockTest | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loggedRef = useRef(false);

  const startTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMockTest();
      setTest(data);
      setResults([]);
      setSectionIdx(0);
      loggedRef.current = false;
      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build mock test");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetToIntro = useCallback(() => {
    setPhase("intro");
    setTest(null);
    setResults([]);
    setSectionIdx(0);
    setError(null);
    loggedRef.current = false;
  }, []);

  const handleSectionComplete = useCallback(
    (summary: { correct: number; total: number; xp: number }) => {
      setResults((prev) => {
        if (!test) return prev;
        const section = test.sections[sectionIdx];
        const next = [...prev];
        next[sectionIdx] = {
          correct: summary.correct,
          total: summary.total,
          xp: summary.xp,
          title: section.title,
          type: section.type,
        };
        return next;
      });
    },
    [test, sectionIdx],
  );

  const goToNextSection = useCallback(() => {
    if (!test) return;
    if (sectionIdx + 1 < test.sections.length) {
      setSectionIdx((i) => i + 1);
    } else {
      setPhase("results");
    }
  }, [test, sectionIdx]);

  // Log final activity + celebrate when results screen mounts
  useEffect(() => {
    if (phase !== "results" || !test || loggedRef.current) return;
    loggedRef.current = true;
    const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
    const totalQ = results.reduce((s, r) => s + r.total, 0) || test.totalQuestions;
    const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
    const bonus = overallPct >= 80 ? XP_REWARDS.perfectSection : 0;
    const xp = XP_REWARDS.mockComplete + bonus;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "mock",
            title: "TOEFL Mock Test",
            score: overallPct,
            xpEarned: xp,
            correct: totalCorrect,
            total: totalQ,
          }),
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        celebrate({
          xpGained: data.xpGained ?? xp,
          leveledUp: data.leveledUp,
          newLevel: data.newLevel,
          unlockedAchievements: data.unlockedAchievements,
          streak: data.streak,
          streakBonus: data.streakBonus,
        });
      } catch {
        // silent — progress is local
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, test, results, celebrate]);

  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const totalQ = test?.totalQuestions ?? results.reduce((s, r) => s + r.total, 0);
  const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const perQuestionXp = results.reduce((s, r) => s + r.xp, 0);
  const bonus = overallPct >= 80 ? XP_REWARDS.perfectSection : 0;
  const totalXp = perQuestionXp + XP_REWARDS.mockComplete + bonus;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Header onReset={phase !== "intro" ? resetToIntro : undefined} />

      {/* Intro */}
      {phase === "intro" && (
        <IntroScreen
          loading={loading}
          error={error}
          onStart={startTest}
        />
      )}

      {/* Running */}
      {phase === "running" && test && (
        <RunningView
          test={test}
          sectionIdx={sectionIdx}
          onSectionComplete={handleSectionComplete}
          onNext={goToNextSection}
        />
      )}

      {/* Results */}
      {phase === "results" && test && (
        <ResultsDashboard
          results={results}
          totalCorrect={totalCorrect}
          totalQ={totalQ}
          overallPct={overallPct}
          perQuestionXp={perQuestionXp}
          totalXp={totalXp}
          bonus={bonus}
          onNewTest={startTest}
          onViewProgress={() => setView("progress")}
          loading={loading}
        />
      )}
    </div>
  );
}

function Header({ onReset }: { onReset?: () => void }) {
  return (
    <header className="flex items-center gap-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
        style={{ background: ACCENT }}
      >
        <Icon name="ClipboardCheck" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">TOEFL Mock Test</h1>
        <p className="text-xs text-muted-foreground">A 3-section simulation crafted by GLM-5.3.</p>
      </div>
      {onReset && (
        <Button onClick={onReset} variant="ghost" size="sm" className="rounded-full">
          <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
          Reset
        </Button>
      )}
    </header>
  );
}

function IntroScreen({
  loading,
  error,
  onStart,
}: {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}) {
  const sections = [
    { type: "reading" as const, label: "Reading", desc: "Passage-based questions", icon: "BookOpen", color: "var(--skill-reading)" },
    { type: "listening" as const, label: "Listening", desc: "Audio + transcript questions", icon: "Headphones", color: "var(--skill-listening)" },
    { type: "structure" as const, label: "Structure", desc: "Grammar & written expression", icon: "SpellCheck", color: "var(--skill-grammar)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <span
              className="grid size-9 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: ACCENT }}
            >
              <Icon name="ClipboardCheck" className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Full simulation
              </p>
              <p className="text-sm font-semibold">3 sections · 9 questions · ~10 min</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            Sit for a condensed TOEFL iBT simulation. GLM-5.3 will craft a fresh reading
            passage, a listening lecture, and a structure set. Answer each question to
            receive immediate feedback, then see your full results dashboard with XP and
            an estimated score.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {sections.map((s) => (
              <div
                key={s.type}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-background p-3"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: s.color }}
                >
                  <Icon name={s.icon} className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={onStart}
            disabled={loading}
            size="lg"
            className="mt-5 w-full rounded-full sm:w-auto"
          >
            {loading ? (
              <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
            ) : (
              <Icon name="Play" className="mr-2 size-4" />
            )}
            {loading ? "Generating your test…" : "Start mock test"}
          </Button>
        </div>
      </Card>

      {loading && <MockSkeleton />}

      {error && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
          <Icon name="XCircle" className="size-8 text-rose-500" />
          <div>
            <p className="text-sm font-semibold">Couldn&apos;t build your test</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button onClick={onStart} variant="outline" size="sm" className="rounded-full">
            <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
            Try again
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function RunningView({
  test,
  sectionIdx,
  onSectionComplete,
  onNext,
}: {
  test: MockTest;
  sectionIdx: number;
  onSectionComplete: (summary: { correct: number; total: number; xp: number }) => void;
  onNext: () => void;
}) {
  const section = test.sections[sectionIdx];
  const meta = SECTION_META[section.type];
  const isLast = sectionIdx + 1 >= test.sections.length;
  const quiz = sectionToQuizSet(section, section.type === "listening");
  const sectionProgressPct = Math.round(((sectionIdx + 1) / test.sections.length) * 100);

  // Auto-scroll to bottom when section is completed (so the summary is in view)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sectionDone, setSectionDone] = useState(false);

  useEffect(() => {
    if (sectionDone && containerRef.current) {
      // Smooth scroll to bottom of section card
      const t = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [sectionDone]);

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {/* Top stepper */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="grid size-8 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: meta.color }}
            >
              <Icon name={meta.icon} className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Section {sectionIdx + 1} of {test.sections.length}
              </p>
              <p className="text-sm font-bold">{section.title}</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {meta.label}
          </span>
        </div>
        <Progress value={sectionProgressPct} className="h-1.5" />
      </Card>

      {/* Listening audio player */}
      {section.type === "listening" && section.questions[0]?.passage && (
        <AudioPlayer transcript={section.questions[0].passage} />
      )}

      {/* Section questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section.title + sectionIdx}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <QuestionRunner
            quiz={quiz}
            accent={meta.color}
            onComplete={(summary) => {
              setSectionDone(true);
              onSectionComplete(summary);
            }}
            onRestart={onNext}
            restartLabel={isLast ? "See results" : "Next section"}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AudioPlayer({ transcript }: { transcript: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Revoke on cleanup or when URL changes
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto-play once URL is set
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {
        // autoplay can be blocked; user can press play
      });
    }
  }, [audioUrl]);

  async function handlePlay() {
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/listening/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, speed: 1.0 }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "TTS failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          disabled={loading}
          aria-label="Play audio passage"
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition hover:scale-105 disabled:opacity-50"
          style={{ background: "var(--skill-listening)" }}
        >
          {loading ? (
            <Icon name="Loader2" className="size-5 animate-spin" />
          ) : (
            <Icon name="Play" className="size-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Audio passage</p>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Synthesizing audio…"
              : audioUrl
                ? "Replay the lecture"
                : "Tap play to listen — take notes as you go."}
          </p>
        </div>
        <Icon name="Volume2" className="size-5 text-muted-foreground" />
      </div>
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="mt-3 w-full"
        />
      )}
    </Card>
  );
}

function ResultsDashboard({
  results,
  totalCorrect,
  totalQ,
  overallPct,
  perQuestionXp,
  totalXp,
  bonus,
  onNewTest,
  onViewProgress,
  loading,
}: {
  results: SectionResult[];
  totalCorrect: number;
  totalQ: number;
  overallPct: number;
  perQuestionXp: number;
  totalXp: number;
  bonus: number;
  onNewTest: () => void;
  onViewProgress: () => void;
  loading: boolean;
}) {
  const performance =
    overallPct >= 90
      ? { label: "Outstanding", note: "You're test-ready — keep this momentum going!" }
      : overallPct >= 75
        ? { label: "Strong", note: "Solid performance. Focus on the weak sections next." }
        : overallPct >= 50
          ? { label: "Developing", note: "Good base — review explanations and retry missed items." }
          : { label: "Early days", note: "Don't worry — practice consistently and you'll climb fast." };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Hero score */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid items-center gap-5 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <Ring value={overallPct} size={148} stroke={13} barClass="text-primary">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Score
                </p>
                <p className="text-3xl font-extrabold leading-none">{overallPct}%</p>
                <p className="text-[10px] text-muted-foreground">{totalCorrect}/{totalQ} correct</p>
              </div>
            </Ring>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon name="Trophy" className="size-5 text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Mock test complete
              </p>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{performance.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{performance.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatChip icon="Zap" label="Total XP" value={`+${totalXp}`} color="text-amber-500" />
              <StatChip
                icon="CheckCircle2"
                label="Correct"
                value={`${totalCorrect}/${totalQ}`}
                color="text-emerald-500"
              />
              {bonus > 0 && (
                <StatChip
                  icon="Star"
                  label="High-score bonus"
                  value={`+${bonus}`}
                  color="text-violet-500"
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Per-section breakdown */}
      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold">Section breakdown</h2>
        <div className="flex flex-col gap-3">
          {results.map((r, i) => {
            const meta = SECTION_META[r.type];
            const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
            return (
              <motion.div
                key={r.title + i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid size-8 place-items-center rounded-xl text-white"
                      style={{ background: meta.color }}
                    >
                      <Icon name={meta.icon} className="size-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-bold">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums">{r.correct}/{r.total}</p>
                    <p className="text-[10px] text-muted-foreground">+{r.xp} XP</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: meta.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Per-question XP detail */}
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Icon name="Lightbulb" className="size-4 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Per-question XP: <span className="font-bold text-foreground">{perQuestionXp}</span> · Mock bonus:{" "}
            <span className="font-bold text-foreground">+{XP_REWARDS.mockComplete}</span>
            {bonus > 0 && (
              <>
                {" "}· High-score bonus: <span className="font-bold text-foreground">+{bonus}</span>
              </>
            )}
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={onNewTest}
          disabled={loading}
          size="lg"
          className="flex-1 rounded-full"
        >
          {loading ? (
            <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
          ) : (
            <Icon name="RefreshCw" className="mr-2 size-4" />
          )}
          New mock test
        </Button>
        <Button
          onClick={onViewProgress}
          variant="outline"
          size="lg"
          className="flex-1 rounded-full"
        >
          <Icon name="Gauge" className="mr-2 size-4" />
          View progress
        </Button>
      </div>
    </motion.div>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
      <Icon name={icon} className={cn("size-3.5", color)} />
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function MockSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}
