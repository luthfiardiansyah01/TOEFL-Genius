"use client";

import { useAppStore } from "@/lib/store";
import { NAV_ITEMS, levelTitle } from "@/lib/constants";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import { useProgress } from "@/hooks/use-progress";
import { Ring } from "@/components/shared/ring";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ViewKey } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOBILE_PRIMARY: ViewKey[] = ["dashboard", "reading", "quiz", "progress"];

export function Shell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const { data } = useProgress();
  const [moreOpen, setMoreOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();

  const p = data?.progress;
  const level = p?.level ?? 1;
  const xp = p?.xp ?? 0;
  const streak = p?.streak ?? 0;
  const levelPct = data?.levelProgressPct ?? 0;
  const intoLevel = data?.intoLevel ?? 0;
  const neededForLevel = data?.neededForLevel ?? 1;
  const userName = user?.name ?? "Learner";
  const userInitial = userName.charAt(0).toUpperCase();

  const go = (v: ViewKey) => {
    setView(v);
    setMoreOpen(false);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => go("dashboard")}
            className="flex items-center gap-2"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Icon name="GraduationCap" className="size-4.5" />
            </span>
            <span className="hidden text-[15px] font-bold tracking-tight sm:block">
              TOEFL<span className="text-gradient-emerald"> Genius</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Streak chip */}
            <div className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-300">
              <Icon name="Flame" className="size-3.5" />
              {streak}
            </div>
            {/* Level + XP chip */}
            <button
              onClick={() => go("progress")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold transition hover:bg-accent"
            >
              <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white">
                {level}
              </span>
              <span className="hidden tabular-nums text-muted-foreground sm:inline">
                {intoLevel}/{neededForLevel} XP
              </span>
            </button>
            {/* Theme toggle */}
            <button
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-accent"
            >
              <Icon name="Sun" className="hidden size-4 dark:block" />
              <Icon name="Moon" className="size-4 dark:hidden" />
            </button>
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Account menu"
                  className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  {userInitial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{userName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go("progress")}>
                  <Icon name="TrendingUp" className="mr-2 size-4" />
                  My progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  <Icon
                    name={resolvedTheme === "dark" ? "Sun" : "Moon"}
                    className="mr-2 size-4"
                  />
                  {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-rose-600 focus:text-rose-600 dark:text-rose-300"
                >
                  <Icon name="Square" className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                  <Icon name="ShieldCheck" className="size-3 text-primary" />
                  Development by{" "}
                  <span className="font-bold text-foreground">MoedaTrace</span>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/60 p-3 lg:flex scroll-area-thin">
          <SidebarNav view={view} go={go} isAdmin={isAdmin} />
          <div className="mt-auto flex flex-col gap-2">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3">
              <div className="flex items-center gap-3">
                <Ring
                  value={levelPct}
                  size={56}
                  stroke={6}
                  barClass="text-primary"
                >
                  <span className="text-sm font-bold">{level}</span>
                </Ring>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{levelTitle(level)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {neededForLevel - intoLevel} XP to next level
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card/40 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">
              <Icon name="Code" className="size-3 text-primary" />
              <span>
                Development by{" "}
                <span className="font-bold text-foreground">MoedaTrace</span>
              </span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-4 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_PRIMARY.map((key) => {
            const item = NAV_ITEMS.find((n) => n.key === key)!;
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => go(key)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn("size-5", active && "scale-110")}
                />
                {item.label}
              </button>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground">
                <Icon name="ChevronRight" className="size-5 rotate-90" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl pb-8">
              <SheetHeader>
                <SheetTitle>Explore</SheetTitle>
              </SheetHeader>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {NAV_ITEMS.filter((n) => n.group !== "admin" || isAdmin).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => go(item.key)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left text-sm font-medium transition hover:bg-accent",
                      view === item.key && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={item.icon} className="size-4.5" />
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-center gap-0.5 text-center">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Icon name="Code" className="size-3.5 text-primary" />
                  Development by{" "}
                  <span className="font-bold text-foreground">MoedaTrace</span>
                </div>
                <p className="text-[10px] text-muted-foreground/80">
                  © {new Date().getFullYear()} MoedaTrace · All rights reserved.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function SidebarNav({
  view,
  go,
  isAdmin,
}: {
  view: ViewKey;
  go: (v: ViewKey) => void;
  isAdmin: boolean;
}) {
  const groups: { label: string; key: "learn" | "test" | "you" | "admin" }[] = [
    { label: "Learn", key: "learn" },
    { label: "Practice", key: "test" },
    { label: "You", key: "you" },
    ...(isAdmin ? [{ label: "Administration", key: "admin" as const }] : []),
  ];
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </p>
          {NAV_ITEMS.filter((n) => n.group === g.key).map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition",
                  active
                    ? item.group === "admin"
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                      : "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-accent",
                )}
              >
                <Icon name={item.icon} className="size-4.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
