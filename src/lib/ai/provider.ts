export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatProvider {
  chat(opts: { system: string; messages: ChatMessage[] }): Promise<string>;
}
