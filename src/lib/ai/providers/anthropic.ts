import Anthropic from "@anthropic-ai/sdk";
import type { ChatProvider } from "../provider";

let _client: Anthropic | null = null;
function client() {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set — required when AI_PROVIDER=anthropic",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export const anthropicProvider: ChatProvider = {
  async chat({ system, messages }) {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  },
};
