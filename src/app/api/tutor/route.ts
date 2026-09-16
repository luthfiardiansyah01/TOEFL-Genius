import { NextRequest, NextResponse } from "next/server";
import { tutorChat } from "@/lib/ai";
import { recordActivity } from "@/lib/gamification";
import { XP_REWARDS } from "@/lib/constants";
import { getAuthUserId } from "@/lib/auth";
import type { TutorMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { messages } = (await req.json()) as { messages: TutorMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    const reply = await tutorChat(messages);

    // award a small XP for tutoring, log activity (once per call)
    const result = await recordActivity({
      userId,
      type: "tutor",
      title: "AI Tutor session",
      xpEarned: XP_REWARDS.correctEasy,
    });

    return NextResponse.json({ reply, ...result });
  } catch (e) {
    console.error("[api/tutor] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tutor failed" },
      { status: 500 },
    );
  }
}
