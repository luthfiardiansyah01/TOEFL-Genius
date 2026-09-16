"use client";

import { useAppStore } from "@/lib/store";
import { useProgress } from "@/hooks/use-progress";
import { Icon } from "@/components/shared/icon";
import { Ring } from "@/components/shared/ring";
import { SKILLS, TOEFL_TIPS, levelTitle } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewKey, SkillKey } from "@/lib/types";

const QUICK: { key: ViewKey; label: string; icon: string; skill: SkillKey; desc: string }[] = [
  { key: "reading", label: "Reading", icon: "BookOpen", skill: "reading", desc: "Passages & questions" },
  { key: "listening", label: "Listening", icon: "Headphones", skill: "listening", desc: "Audio drills" },
  { key: "speaking", label: "Speaking", icon: "Mic", skill: "speaking", desc: "Record & review" },
  { key: "writing", label: "Writing", icon: "PenLine", skill: "writing", desc: "AI-graded essays" },
  { key: "quiz", label: "Quick Quiz", icon: "ListChecks", skill: "vocabulary", desc: "Mixed practice" },
  { key: "mock", label: "Mock Test", icon: "ClipboardCheck", skill: "grammar", desc: "Full simulation" },
];

export function DashboardView() {
  const setView = useAppStore((s) => s.setView);
  const { data, isLoading } = useProgress();
  const p = data?.progress;

  if (isLoading || !p) return <DashboardSkeleton />;

  const dailyPct = Math.min(100, Math.round((p.dailyXpEarned / p.dailyGoalXp) * 100));
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const tip = TOEFL_TIPS[new Date().getDate() % TOEFL_TIPS.length];

  const sections = [
    { label: "Reading", value: p.readingScore, color: "var(--skill-reading)" },
    { label: "Listening", value: p.listeningScore, color: "var(--skill-listening)" },
    { label: "Speaking", value: p.speakingScore, color: "var(--skill-speaking)" },
    { label: "Writing", value: p.writingScore, color: "var(--skill-writing)" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* Greeting + daily goal */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{greeting},</p>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            {p.name} 👋
          </h1>
        </div>
        <Card className="flex items-center gap-3 p-2 pr-3">
          <Ring value={dailyPct} size={48} stroke={6} barClass="text-amber-500">
            <span className="text-[11px] font-bold">{dailyPct}%</span>
          </Ring>
          <div className="leading-tight">
            <p className="text-xs font-semibold">Daily goal</p>
            <p className="text-[11px] text-muted-foreground">
              {p.dailyXpEarned}/{p.dailyGoalXp} XP
            </p>
          </div>
        </Card>
      </div>

      {/* Hero: estimated score + level + streak */}
      <Card className="relative overflow-hidden p-5">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4">
            <Ring
              value={(p.estimatedScore / 120) * 100}
              size={128}
              stroke={11}
              barClass="text-primary"
            >
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Est. TOEFL
                </p>
                <p className="text-3xl font-extrabold leading-none">
                  {p.estimatedScore || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">/ 120</p>
              </div>
            </Ring>
            <div className="sm:hidden">
              <p className="text-xs text-muted-foreground">Estimated iBT score</p>
              <p className="text-sm font-semibold">Practice to refine it</p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3">
            {/* Level + XP bar */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    Lv {p.level} · {levelTitle(p.level)}
                  </span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {data.intoLevel}/{data.neededForLevel} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-teal-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${data.levelProgressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Streak + accuracy */}
            <div className="grid grid-cols-3 gap-2">
              <MiniStat
                icon="Flame"
                label="Streak"
                value={`${p.streak}d`}
                color="text-orange-500"
              />
              <MiniStat
                icon="Target"
                label="Accuracy"
                value={`${p.accuracy}%`}
                color="text-primary"
              />
              <MiniStat
                icon="Trophy"
                label="Best streak"
                value={`${p.longestStreak}d`}
                color="text-amber-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Section score breakdown */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Score breakdown</h2>
          <button
            onClick={() => setView("progress")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            Details <Icon name="ChevronRight" className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sections.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tabular-nums">{s.value}</span>
                <span className="text-xs text-muted-foreground">/30</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: s.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / 30) * 100}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI recommendation */}
      {data.recommendation && (
        <motion.button
          onClick={() => setView(data.recommendation!.activity as ViewKey)}
          whileHover={{ y: -2 }}
          className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-teal-500/5 to-amber-500/10 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-teal-600 text-white shadow">
              <Icon name="Sparkles" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  AI Tutor suggests
                </span>
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                  {data.recommendation.skill} · {data.recommendation.difficulty}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {data.recommendation.title}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {data.recommendation.reason}
              </p>
            </div>
            <Icon
              name="ArrowRight"
              className="size-5 text-primary transition group-hover:translate-x-0.5"
            />
          </div>
        </motion.button>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-bold">Jump back in</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUICK.map((q) => {
            const skill = SKILLS.find((s) => s.key === q.skill)!;
            return (
              <button
                key={q.key}
                onClick={() => setView(q.key)}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-3xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="grid size-10 place-items-center rounded-2xl text-white shadow-sm"
                  style={{ background: skill.color }}
                >
                  <Icon name={q.icon} className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{q.label}</p>
                  <p className="text-[11px] text-muted-foreground">{q.desc}</p>
                </div>
                <Icon
                  name="ArrowRight"
                  className="absolute right-3 top-3 size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent activity + tip */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Recent activity</h2>
            <button
              onClick={() => setView("progress")}
              className="text-xs font-medium text-primary"
            >
              View all
            </button>
          </div>
          {data.activities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-muted">
                <Icon name="Footprints" className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground">
                Start a Reading quiz to begin your journey.
              </p>
              <button
                onClick={() => setView("reading")}
                className="mt-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Start Reading
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.activities.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-2xl px-1 py-1.5"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: `color-mix(in oklch, ${skillColor(a.skill)} 18%, transparent)`,
                      color: skillColor(a.skill),
                    }}
                  >
                    <Icon name={activityIcon(a.type)} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {a.title ?? labelForType(a.type)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo(a.createdAt)}
                      {typeof a.correct === "number" && typeof a.total === "number"
                        ? ` · ${a.correct}/${a.total} correct`
                        : a.score != null
                          ? ` · ${a.score}%`
                          : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                    +{a.xpEarned}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-bold">Tip of the day</h2>
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3">
            <Icon name="Lightbulb" className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-sm leading-relaxed text-foreground/90">{tip}</p>
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-2xl border border-border p-3">
            <Icon name="Sparkles" className="size-4 text-primary" />
            <p className="flex-1 text-xs text-muted-foreground">
              Ask your AI Tutor anything about TOEFL strategy.
            </p>
            <button
              onClick={() => setView("tutor")}
              className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Ask
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({
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
    <div className="rounded-2xl border border-border bg-background p-2.5 text-center">
      <Icon name={icon} className={cn("mx-auto size-4", color)} />
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function skillColor(skill?: string): string {
  const s = SKILLS.find((x) => x.key === skill);
  return s?.color ?? "var(--muted-foreground)";
}
function activityIcon(type: string): string {
  switch (type) {
    case "reading":
      return "BookOpen";
    case "listening":
      return "Headphones";
    case "speaking":
      return "Mic";
    case "writing":
      return "PenLine";
    case "quiz":
      return "ListChecks";
    case "game":
      return "Gamepad2";
    case "mock":
      return "ClipboardCheck";
    case "tutor":
      return "Sparkles";
    default:
      return "Zap";
  }
}
function labelForType(t: string): string {
  const map: Record<string, string> = {
    reading: "Reading practice",
    listening: "Listening practice",
    speaking: "Speaking practice",
    writing: "Writing practice",
    quiz: "Quiz",
    game: "Mini game",
    mock: "Mock test",
    tutor: "AI Tutor chat",
  };
  return map[t] ?? "Activity";
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-16 w-32 rounded-2xl" />
      </div>
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
