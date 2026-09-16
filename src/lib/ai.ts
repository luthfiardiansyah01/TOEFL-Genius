import ZAI from "z-ai-web-dev-sdk";
import type {
  ChoiceQuestion,
  Difficulty,
  SkillKey,
  WritingEvaluation,
  SpeakingEvaluation,
  Recommendation,
  MockTestSection,
  VocabGameItem,
  TutorMessage,
} from "./types";

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function zai() {
  if (!_zai) _zai = await ZAI.create();
  return _zai;
}

const SYSTEM_TUTOR =
  "You are GLM-5.3, an expert TOEFL iBT AI tutor inside a learning app. " +
  "You explain clearly, encourage learners, and give concrete, actionable feedback. " +
  "Keep answers concise and friendly. Use short paragraphs and bullet points when helpful. " +
  "When asked to produce JSON, output ONLY valid JSON (no markdown fences, no commentary).";

async function chatJSON<T>(userPrompt: string, system = SYSTEM_TUTOR): Promise<T> {
  const client = await zai();
  const completion = await client.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return extractJSON<T>(raw);
}

function extractJSON<T>(raw: string): T {
  let text = raw.trim();
  // strip markdown fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // find first { and last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return JSON.parse(text) as T;
}

async function chatText(userPrompt: string, system = SYSTEM_TUTOR): Promise<string> {
  const client = await zai();
  const completion = await client.chat.completions.create({
    messages: [
      { role: "assistant", content: system },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---------- Question generation ----------

export async function generateQuiz(opts: {
  skill: SkillKey;
  difficulty: Difficulty;
  count: number;
  topic?: string;
}): Promise<{ title: string; passage?: string; questions: ChoiceQuestion[] }> {
  const { skill, difficulty, count, topic } = opts;
  const isReading = skill === "reading";
  const prompt = `You are a TOEFL iBT question author. Create ${count} multiple-choice ${skill} questions at "${difficulty}" difficulty${topic ? ` about the topic: "${topic}"` : ""}.

${isReading ? "First write an academic reading passage (180-260 words) appropriate for the difficulty. Then write questions that reference the passage." : skill === "listening" ? "Write a short academic lecture or conversation transcript (150-220 words). Then write questions about it." : skill === "vocabulary" ? "Write vocabulary-in-context questions using sentences." : skill === "grammar" ? "Write Structure & Written Expression style questions." : "Write questions that test higher-level reasoning."}

Return ONLY JSON in this exact shape:
{
  "title": "short quiz title",
  ${isReading || skill === "listening" ? '"passage": "the passage or transcript text",' : '"passage": null,'}
  "questions": [
    {
      "subskill": "main_idea | detail | inference | vocabulary_in_context | purpose | structure | grammar",
      "prompt": "the question text",
      "choices": ["A choice","B choice","C choice","D choice"],
      "answerIndex": 0,
      "explanation": "1-2 sentence explanation of why the answer is correct and why others are wrong."
    }
  ]
}
Rules: exactly 4 choices each. answerIndex is 0-3. Make distractors plausible. Do not include any text outside the JSON.`;

  const data = await chatJSON<{
    title: string;
    passage?: string | null;
    questions: Array<Omit<ChoiceQuestion, "id" | "skill" | "difficulty">>;
  }>(prompt);

  const questions: ChoiceQuestion[] = (data.questions || []).map((q, i) => ({
    id: `q_${Date.now()}_${i}`,
    skill,
    difficulty,
    subskill: q.subskill,
    passage: data.passage || undefined,
    prompt: q.prompt,
    choices: q.choices,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
  }));

  return {
    title: data.title || `${skill} practice`,
    passage: data.passage || undefined,
    questions,
  };
}

// ---------- Answer evaluation / explanation ----------

export async function explainAnswer(opts: {
  question: ChoiceQuestion;
  selectedIndex: number;
}): Promise<{ isCorrect: boolean; deeperExplanation: string }> {
  const q = opts.question;
  const isCorrect = opts.selectedIndex === q.answerIndex;
  const chosen = q.choices[opts.selectedIndex];
  const correct = q.choices[q.answerIndex];
  const prompt = `A learner answered a TOEFL ${q.skill} question ${isCorrect ? "CORRECTLY" : "INCORRECTLY"}.

Question: ${q.prompt}
Choices: ${q.choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}
Correct answer: ${opts.selectedIndex + 1}. ${correct}
Learner chose: ${opts.selectedIndex + 1}. ${chosen}

${q.explanation ? "Quick explanation already given: " + q.explanation : ""}

In 2-4 sentences, give a slightly deeper, encouraging note. If they were wrong, explain the trap and how to avoid it next time. If right, reinforce the skill. Do not use headings.`;
  const deeperExplanation = await chatText(prompt);
  return { isCorrect, deeperExplanation };
}

// ---------- Writing evaluation ----------

export async function evaluateWriting(opts: {
  prompt: string;
  essay: string;
  taskType?: "integrated" | "independent";
}): Promise<WritingEvaluation> {
  const prompt2 = `You are a certified TOEFL iBT writing rater. Evaluate this ${opts.taskType || "independent"} writing task.

Task prompt: ${opts.prompt}
Learner's essay: 
"""
${opts.essay}
"""

Rate on the TOEFL iBT writing scale (0-30). Return ONLY JSON:
{
  "score": <number 0-30>,
  "band": "High | Fair | Limited | Weak",
  "feedback": "3-5 sentence overall feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "correctedExcerpt": "a short improved rewrite of one sentence from the essay"
}`;
  return chatJSON<WritingEvaluation>(prompt2);
}

// ---------- Speaking evaluation ----------

export async function evaluateSpeaking(opts: {
  prompt: string;
  transcript: string;
}): Promise<SpeakingEvaluation> {
  const prompt2 = `You are an expert TOEFL iBT speaking rater. A learner responded to a speaking task. Their speech was transcribed (may contain minor errors).

Task prompt: ${opts.prompt}
Transcript: """
${opts.transcript}
"""

Rate on the TOEFL iBT speaking scale (0-30). Return ONLY JSON:
{
  "score": <number 0-30>,
  "band": "Good | Fair | Limited | Weak",
  "feedback": "3-5 sentence overall feedback",
  "pronunciation": <0-100>,
  "fluency": <0-100>,
  "grammar": <0-100>,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;
  return chatJSON<SpeakingEvaluation>(prompt2);
}

// ---------- Adaptive recommendation ----------

export async function recommendNext(opts: {
  weaknesses: { skill: string; subskill?: string; errorRate: number; totalCount: number }[];
  recentSkills: string[];
}): Promise<Recommendation> {
  const weaknessSummary =
    opts.weaknesses.length === 0
      ? "No major weaknesses detected yet."
      : opts.weaknesses
          .slice(0, 5)
          .map(
            (w) =>
              `${w.skill}${w.subskill ? "/" + w.subskill : ""}: ${(w.errorRate * 100).toFixed(0)}% error over ${w.totalCount} attempts`,
          )
          .join("; ");
  const prompt2 = `You are an adaptive TOEFL tutor. Based on the learner's weaknesses and recent practice, recommend the single best next activity.

Weaknesses: ${weaknessSummary}
Recently practiced skills: ${opts.recentSkills.join(", ") || "none"}

Return ONLY JSON:
{
  "skill": "reading | listening | speaking | writing | vocabulary | grammar",
  "activity": "reading | quiz | writing | speaking | listening | games",
  "difficulty": "easy | medium | hard",
  "title": "a short, motivating activity title",
  "reason": "1-2 sentences why this is the right next step"
}`;
  return chatJSON<Recommendation>(prompt2);
}

// ---------- Mock test ----------

export async function generateMockTest(sectionCount = 3): Promise<{
  sections: MockTestSection[];
}> {
  const prompt2 = `You are a TOEFL iBT mock test generator. Build a short mock test with ${sectionCount} sections: Reading, Listening, and Structure (grammar/vocabulary). Each section has 3 questions. Use TOEFL-style academic content.

Return ONLY JSON:
{
  "sections": [
    {
      "type": "reading",
      "title": "Reading Section",
      "passage": "optional shared passage",
      "questions": [
        {
          "subskill": "main_idea",
          "prompt": "...",
          "choices": ["A","B","C","D"],
          "answerIndex": 0,
          "explanation": "..."
        }
      ]
    },
    {
      "type": "listening",
      "title": "Listening Section",
      "passage": "the transcript (will be read aloud)",
      "questions": [ ... 3 questions ... ]
    },
    {
      "type": "structure",
      "title": "Structure & Written Expression",
      "questions": [ ... 3 questions ... ]
    }
  ]
}
Exactly 3 questions per section, 4 choices each, answerIndex 0-3, plausible distractors, concise explanations. No text outside JSON.`;
  const data = await chatJSON<{
    sections: Array<{
      type: "reading" | "listening" | "structure";
      title: string;
      passage?: string;
      questions: Array<Omit<ChoiceQuestion, "id" | "skill" | "difficulty">>;
    }>;
  }>(prompt2);

  const sections: MockTestSection[] = data.sections.map((s, si) => ({
    type: s.type,
    title: s.title,
    questions: (s.questions || []).map((q, qi) => ({
      id: `mock_${si}_${qi}_${Date.now()}`,
      skill:
        s.type === "reading"
          ? "reading"
          : s.type === "listening"
            ? "listening"
            : "grammar",
      subskill: q.subskill,
      difficulty: "medium",
      passage: s.passage || undefined,
      prompt: q.prompt,
      choices: q.choices,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
    })),
  }));

  return { sections };
}

// ---------- Vocab game ----------

export async function generateVocabGame(count = 6): Promise<VocabGameItem[]> {
  const prompt2 = `Generate ${count} academic vocabulary words useful for the TOEFL. For each word provide the correct meaning and 3 plausible wrong meanings (distractors). Use CEFR B2-C1 level words. Return ONLY JSON:
{
  "items": [
    { "word": "...", "meaning": "...", "distractors": ["...","...","..."] }
  ]
}`;
  const data = await chatJSON<{ items: VocabGameItem[] }>(prompt2);
  return data.items || [];
}

// ---------- AI Tutor chat ----------

export async function tutorChat(messages: TutorMessage[]): Promise<string> {
  const client = await zai();
  const completion = await client.chat.completions.create({
    messages: [
      { role: "assistant", content: SYSTEM_TUTOR },
      ...messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ],
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---------- Listening transcript only (for TTS) ----------
export async function generateListeningMaterial(opts: {
  difficulty: Difficulty;
}): Promise<{ title: string; transcript: string; questions: ChoiceQuestion[] }> {
  const { passage, questions, title } = await generateQuiz({
    skill: "listening",
    difficulty: opts.difficulty,
    count: 3,
  });
  return {
    title,
    transcript: passage || "",
    questions,
  };
}
