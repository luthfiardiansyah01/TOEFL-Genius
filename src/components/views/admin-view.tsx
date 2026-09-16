"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  estimatedScore: number;
  readingScore: number;
  listeningScore: number;
  speakingScore: number;
  writingScore: number;
  lastActivityDate: string | null;
  hasProfile: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalXp: number;
  totalQuestions: number;
  totalCorrect: number;
  avgScore: number;
  avgAccuracy: number;
  activeToday: number;
  newThisWeek: number;
  tiers: { beginner: number; intermediate: number; advanced: number; expert: number };
}

async function fetchUsers(): Promise<{ users: AdminUser[]; total: number }> {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function fetchStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export function AdminView() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: fetchUsers });
  const statsQuery = useQuery({ queryKey: ["admin", "stats"], queryFn: fetchStats });

  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [confirmReset, setConfirmReset] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = usersQuery.data?.users ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  async function handleDelete(user: AdminUser) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success(`${user.name}'s account has been deleted.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }

  async function handleReset(user: AdminUser) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      toast.success(`${user.name}'s progress has been reset.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset progress");
    } finally {
      setBusyId(null);
      setConfirmReset(null);
    }
  }

  const loading = usersQuery.isLoading || statsQuery.isLoading;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
          <Icon name="ShieldCheck" className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Admin Console
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage learner accounts and monitor platform activity.
          </p>
        </div>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : statsQuery.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon="Users" label="Learners" value={String(statsQuery.data.totalUsers)} color="var(--primary)" />
          <StatCard icon="Flame" label="Active today" value={String(statsQuery.data.activeToday)} color="var(--skill-speaking)" />
          <StatCard icon="Zap" label="Total XP" value={statsQuery.data.totalXp.toLocaleString()} color="var(--xp-gold)" />
          <StatCard icon="Gauge" label="Avg score" value={String(statsQuery.data.avgScore)} sub="/120" color="var(--skill-listening)" />
          <StatCard icon="Target" label="Avg accuracy" value={`${statsQuery.data.avgAccuracy}%`} color="var(--skill-reading)" />
          <StatCard icon="Rocket" label="New / 7d" value={String(statsQuery.data.newThisWeek)} color="var(--skill-vocab)" />
        </div>
      ) : null}

      {/* Tier breakdown */}
      {statsQuery.data && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Learners by level tier</h2>
          <div className="flex flex-wrap gap-2">
            {([
              { label: "Beginner (1-3)", count: statsQuery.data.tiers.beginner, color: "var(--skill-reading)" },
              { label: "Intermediate (4-6)", count: statsQuery.data.tiers.intermediate, color: "var(--skill-listening)" },
              { label: "Advanced (7-11)", count: statsQuery.data.tiers.advanced, color: "var(--skill-speaking)" },
              { label: "Expert (12+)", count: statsQuery.data.tiers.expert, color: "var(--skill-vocab)" },
            ] as const).map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2"
              >
                <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                <span className="text-xs font-medium">{t.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User management */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">User accounts</h2>
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length} of {usersQuery.data?.total ?? 0}
          </Badge>
          <div className="relative ml-auto w-full sm:w-64">
            <Icon
              name="Search"
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="Users" className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term." : "No learner accounts yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((u) => (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 sm:flex-row sm:items-center"
              >
                {/* Identity */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
                      u.role === "ADMIN"
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-600"
                        : "bg-gradient-to-br from-emerald-500 to-teal-600",
                    )}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{u.name}</p>
                      {u.role === "ADMIN" && (
                        <Badge className="bg-violet-500/15 text-[9px] text-violet-600 hover:bg-violet-500/15 dark:text-violet-300">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Icon name="Mail" className="size-3" />
                      {u.email}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <Metric label="Level" value={String(u.level)} />
                  <Metric label="XP" value={u.xp.toLocaleString()} />
                  <Metric
                    label="Score"
                    value={u.estimatedScore > 0 ? String(u.estimatedScore) : "—"}
                  />
                  <Metric label="Acc" value={u.accuracy > 0 ? `${u.accuracy}%` : "—"} />
                  <Metric
                    label="Streak"
                    value={u.streak > 0 ? `${u.streak}d` : "—"}
                  />
                  <Metric
                    label="Joined"
                    value={new Date(u.createdAt).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  />
                </div>

                {/* Actions */}
                {u.role !== "ADMIN" && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      disabled={busyId === u.id}
                      onClick={() => setConfirmReset(u)}
                    >
                      <Icon name="RotateCcw" className="mr-1 size-3.5" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-rose-500/40 px-2.5 text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                      disabled={busyId === u.id}
                      onClick={() => setConfirmDelete(u)}
                    >
                      <Icon name="Trash2" className="mr-1 size-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {confirmDelete?.name}
              </span>{" "}
              ({confirmDelete?.email}) and all associated learning data — XP,
              progress, attempts, achievements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation */}
      <AlertDialog
        open={!!confirmReset}
        onOpenChange={(o) => !o && setConfirmReset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this learner's progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will wipe all learning data for{" "}
              <span className="font-semibold text-foreground">
                {confirmReset?.name}
              </span>{" "}
              — XP, level, streak, scores, attempts, and achievements will return
              to zero. The account itself stays active. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => confirmReset && handleReset(confirmReset)}
            >
              Reset progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
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
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-extrabold tabular-nums">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}
