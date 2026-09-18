import ZAI from "z-ai-web-dev-sdk";
import type { ChatProvider } from "../provider";

let _client: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function client() {
  if (!_client) _client = await ZAI.create();
  return _client;
}

export const zaiProvider: ChatProvider = {
  async chat({ system, messages }) {
    const c = await client();
    const completion = await c.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content ?? "";
  },
};
