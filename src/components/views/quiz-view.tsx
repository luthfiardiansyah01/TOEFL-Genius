"use client";

import { PracticePanel } from "@/components/shared/practice-panel";

export function QuizView() {
  return (
    <PracticePanel
      skill="vocabulary"
      title="Quick Quiz"
      subtitle="Pick a skill & difficulty. GLM-5.3 builds a fresh set every time."
      accent="var(--skill-vocab)"
      allowSkillChange
      showTopic
      count={5}
    />
  );
}
