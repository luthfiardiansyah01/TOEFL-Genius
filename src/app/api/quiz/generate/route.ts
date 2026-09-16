import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai";
import type { Difficulty, SkillKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const skill = (body.skill as SkillKey) || "reading";
    const difficulty = (body.difficulty as Difficulty) || "medium";
    const count = Math.min(8, Math.max(1, Number(body.count) || 4));
    const topic = body.topic as string | undefined;

    const quiz = await generateQuiz({ skill, difficulty, count, topic });
    return NextResponse.json({ id: `quiz_${Date.now()}`, ...quiz });
  } catch (e) {
    console.error("[api/quiz/generate] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
