"use client";

import { useAppStore } from "@/lib/store";
import { Shell } from "@/components/app/shell";
import { EventOverlay } from "@/components/shared/event-overlay";
import { AuthScreen } from "@/components/app/auth-screen";
import { useAuth } from "@/hooks/use-auth";
import { DashboardView } from "@/components/views/dashboard-view";
import { ReadingView } from "@/components/views/reading-view";
import { ListeningView } from "@/components/views/listening-view";
import { SpeakingView } from "@/components/views/speaking-view";
import { WritingView } from "@/components/views/writing-view";
import { QuizView } from "@/components/views/quiz-view";
import { GamesView } from "@/components/views/games-view";
import { MockTestView } from "@/components/views/mock-test-view";
import { ProgressView } from "@/components/views/progress-view";
import { TutorView } from "@/components/views/tutor-view";
import { AdminView } from "@/components/views/admin-view";
import { Icon } from "@/components/shared/icon";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const { authenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Icon name="GraduationCap" className="size-6 animate-pulse" />
          </span>
          <p className="text-sm text-muted-foreground">Loading TOEFL Genius…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <AuthScreen />;
  }

  // Guard: non-admins can never render the admin view.
  const safeView = view === "admin" && !isAdmin ? "dashboard" : view;

  return (
    <>
      <EventOverlay />
      <Shell>{renderView(safeView)}</Shell>
    </>
  );
}

function renderView(view: string) {
  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "reading":
      return <ReadingView />;
    case "listening":
      return <ListeningView />;
    case "speaking":
      return <SpeakingView />;
    case "writing":
      return <WritingView />;
    case "quiz":
      return <QuizView />;
    case "games":
      return <GamesView />;
    case "mock":
      return <MockTestView />;
    case "progress":
      return <ProgressView />;
    case "tutor":
      return <TutorView />;
    case "admin":
      return <AdminView />;
    default:
      return <DashboardView />;
  }
}
