import { NextRequest, NextResponse } from "next/server";
import { generateMockTest } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sections = Math.min(3, Math.max(1, Number(body.sections) || 3));
    const data = await generateMockTest(sections);
    const totalQuestions = data.sections.reduce((s, sec) => s + sec.questions.length, 0);
    return NextResponse.json({
      id: `mock_${Date.now()}`,
      sections: data.sections,
      totalQuestions,
    });
  } catch (e) {
    console.error("[api/mock-test] error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build mock test" },
      { status: 500 },
    );
  }
}
