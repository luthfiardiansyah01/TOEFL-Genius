import { NextRequest, NextResponse } from "next/server";
import { evaluateWriting } from "@/lib/ai";
import { recordActivity } from "@/lib/gamification";
import { db } from "@/lib/db";
import { XP_REWARDS } from "@/lib/constants";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, essay, taskType } = body as {
      prompt: string;
      essay: string;
      taskType?: "integrated" | "independent";
    };
    if (!prompt || !essay || essay.trim().length < 20) {
      return NextResponse.json(
        { error: "A prompt and an essay (at least 20 chars) are required" },
        { status: 400 },
      );
    }

    const evaluation = await evaluateWriting({ prompt, essay, taskType });

    // store the writing score on the profile (overwrites latest)
    const profile = await getProfile();
    await db.userProfile.update({
      where: { id: profile.id },
      data: { writingScore: Math.max(profile.writingScore, evaluation.score) },
    });

    const xpEarned = XP_REWARDS.writingSubmission + Math.round((evaluation.score / 30) * 20);
    const result = await recordActivity({
      type: "writing",
      skill: "writing",
      title: taskType === "integrated" ? "Integrated Writing" : "Independent Writing",
      score: Math.round((evaluation.score / 30) * 100),
      xpEarned,
      metadata: { score: evaluation.score, band: evaluation.band, wordCount: essay.split(/\s+/).length },
    });

    return NextResponse.json({ evaluation, ...result });
  } catch (e) {
    console.error("[api/writing/evaluate] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Evaluation failed" },
      { status: 500 },
    );
  }
}
