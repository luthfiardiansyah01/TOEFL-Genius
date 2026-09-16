import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { evaluateSpeaking } from "@/lib/ai";
import { recordActivity } from "@/lib/gamification";
import { db } from "@/lib/db";
import { XP_REWARDS } from "@/lib/constants";
import { getProfile } from "@/lib/profile";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const contentType = req.headers.get("content-type") || "";
    let prompt = "";
    let audioBase64 = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      prompt = body.prompt || "";
      audioBase64 = body.audio || "";
    } else {
      const form = await req.formData();
      prompt = (form.get("prompt") as string) || "";
      const file = form.get("audio") as File | null;
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        audioBase64 = buf.toString("base64");
      }
    }

    if (!prompt || !audioBase64) {
      return NextResponse.json(
        { error: "prompt and audio are required" },
        { status: 400 },
      );
    }

    // 1. Transcribe with ASR
    const zai = await ZAI.create();
    const asrResp = await zai.audio.asr.create({ file_base64: audioBase64 });
    const transcript = (asrResp.text || "").trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "Could not transcribe your audio. Please try speaking again." },
        { status: 422 },
      );
    }

    // 2. Evaluate with GLM
    const evaluation = await evaluateSpeaking({ prompt, transcript });

    // store speaking score
    const profile = await getProfile(userId);
    await db.userProfile.update({
      where: { id: profile.id },
      data: { speakingScore: Math.max(profile.speakingScore, evaluation.score) },
    });

    const xpEarned = XP_REWARDS.speakingSubmission + Math.round((evaluation.score / 30) * 20);
    const result = await recordActivity({
      userId,
      type: "speaking",
      skill: "speaking",
      title: "Speaking Practice",
      score: Math.round((evaluation.score / 30) * 100),
      xpEarned,
      metadata: { score: evaluation.score, band: evaluation.band },
    });

    return NextResponse.json({ transcript, evaluation, ...result });
  } catch (e) {
    console.error("[api/speaking/evaluate] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Speaking evaluation failed" },
      { status: 500 },
    );
  }
}
