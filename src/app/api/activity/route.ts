import { NextRequest, NextResponse } from "next/server";
import { recordActivity } from "@/lib/gamification";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Generic activity logger for quiz/game/mock completions (no per-question scoring)
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      type,
      skill,
      title,
      score,
      xpEarned,
      correct,
      total,
      durationSec,
      metadata,
    } = body as {
      type: string;
      skill?: string;
      title?: string;
      score?: number;
      xpEarned?: number;
      correct?: number;
      total?: number;
      durationSec?: number;
      metadata?: unknown;
    };
    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }
    const result = await recordActivity({
      userId,
      type,
      skill,
      title,
      score,
      xpEarned: xpEarned ?? 0,
      correct,
      total,
      durationSec,
      metadata,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/activity] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to log activity" },
      { status: 500 },
    );
  }
}
