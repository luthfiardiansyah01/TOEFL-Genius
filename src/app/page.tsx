"use client";

import { useAppStore } from "@/lib/store";
import { Shell } from "@/components/app/shell";
import { EventOverlay } from "@/components/shared/event-overlay";
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

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <>
      <EventOverlay />
      <Shell>{renderView(view)}</Shell>
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
    default:
      return <DashboardView />;
  }
}
