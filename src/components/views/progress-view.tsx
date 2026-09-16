"use client";

import { useProgress } from "@/hooks/use-progress";
import { Icon } from "@/components/shared/icon";
import { Ring } from "@/components/shared/ring";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILLS, ACHIEVEMENT_DEFS, levelTitle } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";

const TIER_STYLE: Record<string, string> = {
  bronze: "from-orange-700/80 to-amber-700/60 text-orange-50",
  silver: "from-slate-400 to-slate-500 text-slate-50",
  gold: "from-amber-400 to-yellow-500 text-amber-950",
  platinum: "from-cyan-300 to-teal-400 text-teal-950",
};

export function ProgressView() {
  const { data, isLoading } = useProgress();
  const setView = useAppStore((s) => s.setView);

  if (isLoading || !data) return <ProgressSkeleton />;

  const p = data.progress;
  const xpChart = data.xpHistory.map((d) => ({
    day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }).slice(0, 1),
    xp: d.xp,
  }));
  const accChart = data.accuracyBySkill.map((s) => ({
    skill: s.skill.charAt(0).toUpperCase() + s.skill.slice(1),
    accuracy: s.accuracy,
    color: SKILLS.find((x) => x.key === s.skill)?.color ?? "var(--primary)",
  }));

  const unlocked = data.achievements.filter((a) => a.unlocked);
  const inProgress = data.achievements.filter((a) => !a.unlocked);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Your progress</h1>
        <p className="text-xs text-muted-foreground">
          Track your growth across every TOEFL skill.
        </p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon="Gauge" label="Est. TOEFL" value={`${p.estimatedScore}`} sub="/ 120" color="var(--primary)" />
        <StatTile icon="Star" label="Level" value={`${p.level}`} sub={levelTitle(p.level)} color="var(--skill-vocab)" />
        <StatTile icon="Flame" label="Streak" value={`${p.streak}d`} sub={`best ${p.longestStreak}d`} color="var(--skill-speaking)" />
        <StatTile icon="Target" label="Accuracy" value={`${p.accuracy}%`} sub={`${p.correctQuestions}/${p.totalQuestions}`} color="var(--skill-reading)" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        {/* XP history */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">XP this week</h2>
            <span className="text-xs text-muted-foreground">
              {xpChart.reduce((s, d) => s + d.xp, 0)} XP total
            </span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={xpChart} margin={{ left: -20, right: 6, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={36} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="xp" stroke="var(--primary)" strokeWidth={2.5} fill="url(#xpFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Score ring */}
        <Card className="flex flex-col items-center justify-center gap-3 p-4">
          <Ring value={(p.estimatedScore / 120) * 100} size={132} stroke={12} barClass="text-primary">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">iBT</p>
              <p className="text-3xl font-extrabold leading-none">{p.estimatedScore}</p>
              <p className="text-[10px] text-muted-foreground">/ 120</p>
            </div>
          </Ring>
          <div className="grid w-full grid-cols-4 gap-1.5">
            {[
              { l: "R", v: p.readingScore, c: "var(--skill-reading)" },
              { l: "L", v: p.listeningScore, c: "var(--skill-listening)" },
              { l: "S", v: p.speakingScore, c: "var(--skill-speaking)" },
              { l: "W", v: p.writingScore, c: "var(--skill-writing)" },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border border-border bg-background p-1.5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground">{x.l}</p>
                <p className="text-sm font-extrabold tabular-nums" style={{ color: x.v > 0 ? x.c : undefined }}>
                  {x.v || "—"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Accuracy by skill */}
      {accChart.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-bold">Accuracy by skill</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accChart} margin={{ left: -20, right: 6, top: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="skill" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={36} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                />
                <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                  {accChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Weakness analysis */}
      {data.weaknesses.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="Brain" className="size-4 text-primary" />
            <h2 className="text-sm font-bold">Adaptive focus areas</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            GLM-5.3 tracks where you slip up and tailors your next sessions.
          </p>
          <div className="flex flex-col gap-2">
            {data.weaknesses.slice(0, 6).map((w) => {
              const skillDef = SKILLS.find((s) => s.key === w.skill);
              return (
                <div
                  key={`${w.skill}-${w.subskill}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: skillDef?.color ?? "var(--muted-foreground)" }}
                  >
                    <Icon name={skillDef?.icon ?? "Brain"} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">
                      {w.skill}
                      {w.subskill ? <span className="text-muted-foreground"> · {w.subskill.replace(/_/g, " ")}</span> : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {w.errorCount} misses of {w.totalCount} · {Math.round(w.errorRate * 100)}% error
                    </p>
                  </div>
                  <button
                    onClick={() => setView((w.skill as ViewKey) === "grammar" || w.skill === "vocabulary" || w.skill === "structure" ? "quiz" : (w.skill as ViewKey))}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                  >
                    Practice
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Achievements */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Trophy" className="size-4 text-amber-500" />
            <h2 className="text-sm font-bold">Achievements</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {unlocked.length}/{data.achievements.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {data.achievements.map((a) => {
            const def = ACHIEVEMENT_DEFS.find((d) => d.code === a.code);
            const pct = Math.min(100, Math.round((a.progress / (a.threshold || 1)) * 100));
            return (
              <motion.div
                key={a.code}
                whileHover={{ y: -2 }}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition",
                  a.unlocked
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-background opacity-80",
                )}
              >
                <div
                  className={cn(
                    "grid size-12 place-items-center rounded-full bg-gradient-to-br shadow-sm",
                    a.unlocked ? TIER_STYLE[a.tier] : "from-muted to-muted text-muted-foreground",
                  )}
                >
                  <Icon name={a.unlocked ? a.icon : "Lock"} className="size-5" />
                </div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{a.title}</p>
                {a.unlocked ? (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    {a.tier}
                  </span>
                ) : (
                  <span className="text-[9px] tabular-nums text-muted-foreground">
                    {a.progress}/{a.threshold}
                  </span>
                )}
                {!a.unlocked && pct > 0 && (
                  <div className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <span className="sr-only">{a.description}</span>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} className="size-3.5" style={{ color }} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-56 rounded-3xl" />
      </div>
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}
