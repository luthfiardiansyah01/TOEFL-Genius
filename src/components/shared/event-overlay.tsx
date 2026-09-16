"use client";

import { useEffect } from "react";
import { useAppStore, type ToastEvent } from "@/lib/store";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const STYLES: Record<
  ToastEvent["kind"],
  { icon: string; ring: string; chip: string }
> = {
  xp: {
    icon: "Zap",
    ring: "text-amber-500 bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  levelup: {
    icon: "Rocket",
    ring: "text-emerald-600 bg-emerald-500/10",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  achievement: {
    icon: "Trophy",
    ring: "text-violet-600 bg-violet-500/10",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  streak: {
    icon: "Flame",
    ring: "text-orange-500 bg-orange-500/10",
    chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  info: {
    icon: "Lightbulb",
    ring: "text-sky-600 bg-sky-500/10",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
};

export function EventOverlay() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), 4200),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLES[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto w-full max-w-sm cursor-pointer rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    s.ring,
                  )}
                >
                  <Icon name={s.icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        s.chip,
                      )}
                    >
                      {t.kind}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
