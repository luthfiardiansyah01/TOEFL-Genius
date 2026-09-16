"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useProgress } from "@/hooks/use-progress";
import { XP_REWARDS } from "@/lib/constants";
import type { VocabGameItem } from "@/lib/types";

const ACCENT = "var(--skill-vocab)"; // violet

interface Pair {
  id: string;
  word: string;
  meaning: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function fetchVocab(): Promise<VocabGameItem[]> {
  const res = await fetch("/api/games/vocab", { cache: "no-store" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to load vocabulary game");
  }
  const data = (await res.json()) as { items: VocabGameItem[] };
  return data.items ?? [];
}

export function GamesView() {
  return <VocabMatchGame />;
}

function VocabMatchGame() {
  const { celebrate } = useProgress();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [wordOrder, setWordOrder] = useState<Pair[]>([]);
  const [meaningOrder, setMeaningOrder] = useState<Pair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ wordId: string; meaningId: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [finalXp, setFinalXp] = useState<number | null>(null);
  const [loggingActivity, setLoggingActivity] = useState(false);

  const total = pairs.length;
  const matchedCount = matched.size;
  const progressPct = total === 0 ? 0 : Math.round((matchedCount / total) * 100);
  const accuracy = attempts === 0 ? 100 : Math.round((correct / attempts) * 100);

  // Tick timer
  useEffect(() => {
    if (!startTime || completed) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [startTime, completed]);

  const startRound = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCompleted(false);
    setFinalXp(null);
    setSelectedWordId(null);
    setMatched(new Set());
    setWrongPair(null);
    setAttempts(0);
    setCorrect(0);
    setElapsed(0);
    setStartTime(null);
    try {
      const items = await fetchVocab();
      if (!items.length) throw new Error("No vocabulary items returned");
      const built: Pair[] = items.map((it, i) => ({
        id: `pair-${Date.now()}-${i}`,
        word: it.word,
        meaning: it.meaning,
      }));
      setPairs(built);
      setWordOrder(shuffle(built));
      setMeaningOrder(shuffle(built));
      setStartTime(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load game");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-start once on mount
  useEffect(() => {
    void startRound();
  }, [startRound]);

  // Round completion effect
  const completedRef = useRef(completed);
  completedRef.current = completed;
  useEffect(() => {
    if (total > 0 && matchedCount === total && !completedRef.current) {
      const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const speedBonus = durationSec <= 45 ? 10 : 0;
      const accuracyBonus = attempts > 0 && correct === attempts ? 10 : 0;
      const xp = XP_REWARDS.gameComplete + speedBonus + accuracyBonus;
      setCompleted(true);
      setFinalXp(xp);

      // log activity once
      let cancelled = false;
      (async () => {
        setLoggingActivity(true);
        try {
          const res = await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "game",
              skill: "vocabulary",
              title: "Vocab Match",
              score: accuracy,
              xpEarned: xp,
              correct,
              total,
              durationSec,
              metadata: { speedBonus, accuracyBonus },
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
          // Silent: progress is local. Don't block UX.
        } finally {
          if (!cancelled) setLoggingActivity(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [matchedCount, total, completed, startTime, attempts, correct, accuracy, celebrate]);

  function handleWordClick(id: string) {
    if (matched.has(id) || completed) return;
    setSelectedWordId((cur) => (cur === id ? null : id));
  }

  function handleMeaningClick(meaningPairId: string) {
    if (!selectedWordId || completed) return;
    if (matched.has(meaningPairId)) return;

    const wordPairId = selectedWordId;
    setAttempts((a) => a + 1);

    if (wordPairId === meaningPairId) {
      // correct
      setMatched((s) => new Set(s).add(wordPairId));
      setCorrect((c) => c + 1);
      setSelectedWordId(null);
    } else {
      // wrong
      setWrongPair({ wordId: wordPairId, meaningId: meaningPairId });
      setTimeout(() => setWrongPair(null), 600);
      setSelectedWordId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Header />

      {/* Game picker */}
      <GamePicker
        activeKey="vocab"
        disabled={isLoading || completed}
        onPick={() => void startRound()}
      />

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-500/40 bg-rose-500/5 p-8 text-center">
          <Icon name="XCircle" className="size-8 text-rose-500" />
          <div>
            <p className="text-sm font-semibold">Couldn&apos;t load the game</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => void startRound()} variant="outline" size="sm" className="rounded-full">
            <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
            Try again
          </Button>
        </div>
      )}

      {/* Active game */}
      {!isLoading && !error && pairs.length > 0 && !completed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* Stats bar */}
          <Card className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 place-items-center rounded-xl text-white"
                style={{ background: ACCENT }}
              >
                <Icon name="Clock" className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Time
                </p>
                <p className="text-sm font-bold tabular-nums">{formatTime(elapsed)}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Matched
              </p>
              <p className="text-sm font-bold tabular-nums">
                {matchedCount}/{total}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Accuracy
              </p>
              <p className="text-sm font-bold tabular-nums">{accuracy}%</p>
            </div>
            <Button
              onClick={() => void startRound()}
              variant="ghost"
              size="sm"
              className="ml-auto rounded-full"
            >
              <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
              New
            </Button>
          </Card>

          {/* Progress bar */}
          <div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {/* Instruction */}
          <p className="px-1 text-center text-xs text-muted-foreground">
            {selectedWordId
              ? "Now tap the matching meaning →"
              : "Tap a word, then tap its matching meaning."}
          </p>

          {/* Board: words | meanings */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Words
              </p>
              {wordOrder.map((p) => (
                <Chip
                  key={`w-${p.id}`}
                  label={p.word}
                  state={
                    matched.has(p.id)
                      ? "matched"
                      : wrongPair?.wordId === p.id
                        ? "wrong"
                        : selectedWordId === p.id
                          ? "selected"
                          : "idle"
                  }
                  side="word"
                  onClick={() => handleWordClick(p.id)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Meanings
              </p>
              {meaningOrder.map((p) => (
                <Chip
                  key={`m-${p.id}`}
                  label={p.meaning}
                  state={
                    matched.has(p.id)
                      ? "matched"
                      : wrongPair?.meaningId === p.id
                        ? "wrong"
                        : "idle"
                  }
                  side="meaning"
                  onClick={() => handleMeaningClick(p.id)}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Completed state */}
      {!isLoading && !error && completed && (
        <ResultsCard
          timeSec={elapsed}
          attempts={attempts}
          correct={correct}
          total={total}
          xp={finalXp ?? XP_REWARDS.gameComplete}
          logging={loggingActivity}
          onPlayAgain={() => void startRound()}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
        style={{ background: ACCENT }}
      >
        <Icon name="Gamepad2" className="size-5" />
      </span>
      <div>
        <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">Mini Games</h1>
        <p className="text-xs text-muted-foreground">Learn vocabulary through play.</p>
      </div>
    </header>
  );
}

function GamePicker({
  activeKey,
  disabled,
  onPick,
}: {
  activeKey: string;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={onPick}
        disabled={disabled}
        className={cn(
          "group relative flex flex-col items-start gap-2 overflow-hidden rounded-3xl border p-4 text-left transition",
          activeKey === "vocab"
            ? "border-transparent text-white shadow-md"
            : "border-border bg-card hover:-translate-y-0.5 hover:shadow-md",
        )}
        style={activeKey === "vocab" ? { background: ACCENT } : undefined}
      >
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl",
            activeKey === "vocab" ? "bg-white/20 text-white" : "text-white",
          )}
          style={activeKey === "vocab" ? undefined : { background: ACCENT }}
        >
          <Icon name="Languages" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">Vocab Match</p>
          <p
            className={cn(
              "text-[11px]",
              activeKey === "vocab" ? "text-white/80" : "text-muted-foreground",
            )}
          >
            Pair words with meanings
          </p>
        </div>
      </button>

      <div className="relative flex cursor-not-allowed flex-col items-start gap-2 overflow-hidden rounded-3xl border border-dashed border-border bg-muted/40 p-4 opacity-80">
        <span className="grid size-10 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon name="SpellCheck" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-muted-foreground">Grammar Scramble</p>
          <p className="text-[11px] text-muted-foreground">Reorder the sentence · Coming soon</p>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          <Icon name="Lock" className="mr-1 inline size-3" />
          Soon
        </span>
      </div>
    </div>
  );
}

function Chip({
  label,
  state,
  side,
  onClick,
}: {
  label: string;
  state: "idle" | "selected" | "matched" | "wrong";
  side: "word" | "meaning";
  onClick: () => void;
}) {
  const isInteractive = state === "idle" || state === "selected";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={state === "matched"}
      whileTap={isInteractive ? { scale: 0.97 } : undefined}
      animate={
        state === "wrong"
          ? { x: [0, -6, 6, -4, 4, 0] }
          : state === "matched"
            ? { scale: [1, 1.06, 1] }
            : {}
      }
      transition={{ duration: state === "wrong" ? 0.45 : 0.35 }}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
        side === "meaning" && "text-foreground/90",
        state === "idle" &&
          "border-border bg-card hover:border-primary/40 hover:bg-accent",
        state === "selected" &&
          "border-primary bg-primary/5 ring-2 ring-primary/30",
        state === "matched" &&
          "cursor-default border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        state === "wrong" &&
          "border-rose-500/70 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      )}
    >
      <span className="flex-1">{label}</span>
      {state === "matched" && <Icon name="CheckCircle2" className="size-4 shrink-0" />}
      {state === "wrong" && <Icon name="XCircle" className="size-4 shrink-0" />}
    </motion.button>
  );
}

function ResultsCard({
  timeSec,
  attempts,
  correct,
  total,
  xp,
  logging,
  onPlayAgain,
}: {
  timeSec: number;
  attempts: number;
  correct: number;
  total: number;
  xp: number;
  logging: boolean;
  onPlayAgain: () => void;
}) {
  const accuracy = attempts === 0 ? 100 : Math.round((correct / attempts) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <Card className="relative overflow-hidden p-6 text-center">
        {/* Confetti burst */}
        <ConfettiBurst />
        <div className="relative">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg"
          >
            <Icon name="Trophy" className="size-8" />
          </motion.div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Round complete
          </p>
          <p className="mt-1 text-3xl font-extrabold">+{xp} XP</p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <ResultStat icon="Clock" label="Time" value={formatTime(timeSec)} />
            <ResultStat icon="Target" label="Accuracy" value={`${accuracy}%`} />
            <ResultStat icon="CheckCircle2" label="Matched" value={`${correct}/${total}`} />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {accuracy === 100
              ? "Perfect round! You matched every pair on the first try."
              : accuracy >= 75
                ? "Great work — keep building that vocabulary."
                : "Nice effort. Try again to sharpen your recall."}
          </p>

          <Button
            onClick={onPlayAgain}
            disabled={logging}
            className="mt-5 rounded-full"
            size="lg"
          >
            {logging ? (
              <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
            ) : (
              <Icon name="RefreshCw" className="mr-2 size-4" />
            )}
            Play again
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function ResultStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <Icon name={icon} className="mx-auto size-4 text-primary" />
      <p className="mt-1 text-base font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ConfettiBurst() {
  // Simple decorative emerald dots burst
  const dots = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.15,
        scale: 0.6 + Math.random() * 0.8,
        color: ["bg-emerald-500", "bg-amber-500", "bg-teal-500", "bg-violet-500"][i % 4],
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {dots.map((d) => (
        <motion.span
          key={d.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{ x: d.x, y: d.y, scale: d.scale, opacity: [0, 1, 0] }}
          transition={{ duration: 1, delay: d.delay, ease: "easeOut" }}
          className={cn("absolute size-2 rounded-full", d.color)}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-14 rounded-3xl" />
      <Skeleton className="h-2 rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`w-${i}`} className="h-11 rounded-2xl" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`m-${i}`} className="h-11 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
