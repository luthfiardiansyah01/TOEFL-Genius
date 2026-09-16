"use client";

import { PracticePanel } from "@/components/shared/practice-panel";

export function ReadingView() {
  return (
    <PracticePanel
      skill="reading"
      title="Reading Practice"
      subtitle="Read an academic passage, then answer GLM-crafted questions."
      accent="var(--skill-reading)"
      passageLayout
      showTopic
      count={4}
    />
  );
}
