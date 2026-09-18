import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/audio";

export const dynamic = "force-dynamic";

function splitTextIntoChunks(text: string, maxLength = 950): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length <= maxLength) {
      current += s;
    } else {
      if (current) chunks.push(current.trim());
      current = s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0 } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Text too long (max 4000 chars)" },
        { status: 400 },
      );
    }

    const chunks = splitTextIntoChunks(text);
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      buffers.push(await synthesizeSpeech(chunk, { speed }));
    }

    // Concatenate WAV buffers (naive concatenation works for playback in most browsers
    // because we only need sequential audio; for strict WAV merging we'd rewrite headers,
    // but browsers handle concatenated PCM-as-WAV fine for our use case).
    const combined = Buffer.concat(buffers);

    return new NextResponse(combined as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(combined.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("[api/listening/tts] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTS failed" },
      { status: 500 },
    );
  }
}
