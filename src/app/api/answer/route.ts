import { NextRequest, NextResponse } from "next/server";
import { recordAnswer } from "@/lib/gamification";
import { getAuthUserId } from "@/lib/auth";
import type { ChoiceQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { question, selectedIndex } = body as {
      question: ChoiceQuestion;
      selectedIndex: number;
    };
    if (!question || typeof selectedIndex !== "number") {
      return NextResponse.json(
        { error: "question and selectedIndex are required" },
        { status: 400 },
      );
    }
    const isCorrect = selectedIndex === question.answerIndex;
    const result = await recordAnswer({
      userId,
      skill: question.skill,
      subskill: question.subskill,
      difficulty: question.difficulty,
      isCorrect,
      question,
      userAnswer: question.choices[selectedIndex],
      correctAnswer: question.choices[question.answerIndex],
      explanation: question.explanation,
    });

    return NextResponse.json({
      isCorrect,
      correctAnswer: question.choices[question.answerIndex],
      explanation: question.explanation,
      ...result,
    });
  } catch (e) {
    console.error("[api/answer] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
