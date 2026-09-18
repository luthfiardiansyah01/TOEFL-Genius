import type { ChatProvider } from "./provider";
import { zaiProvider } from "./providers/zai";
import { anthropicProvider } from "./providers/anthropic";

/**
 * AI_PROVIDER selects the backend used for all chat-based AI features
 * (quiz generation, evaluation, tutoring). Defaults to "zai" to preserve
 * existing behavior; set to "anthropic" plus ANTHROPIC_API_KEY to use the
 * Anthropic API instead. Speech-to-text and text-to-speech are separate
 * concerns and still depend on the z-ai SDK (see src/lib/audio.ts) since
 * Anthropic does not offer those.
 */
function getProvider(): ChatProvider {
  switch (process.env.AI_PROVIDER) {
    case "anthropic":
      return anthropicProvider;
    case "zai":
    default:
      return zaiProvider;
  }
}

export type { ChatMessage } from "./provider";

export async function chat(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  return getProvider().chat(opts);
}
