import { NextResponse } from "next/server";
import { generateVocabGame } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await generateVocabGame(6);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/games/vocab] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate vocab game" },
      { status: 500 },
    );
  }
}
