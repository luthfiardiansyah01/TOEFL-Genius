import ZAI from "z-ai-web-dev-sdk";

/**
 * Speech-to-text and text-to-speech are isolated here because, unlike the
 * chat-based AI features in src/lib/ai.ts, they are not yet abstracted
 * behind a swappable provider — z-ai-web-dev-sdk is the only implementation
 * available today. Swapping this out (e.g. for a dedicated ASR/TTS vendor)
 * only requires changing this file.
 */

let _client: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function client() {
  if (!_client) _client = await ZAI.create();
  return _client;
}

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const c = await client();
  const resp = await c.audio.asr.create({ file_base64: audioBase64 });
  return (resp.text || "").trim();
}

export async function synthesizeSpeech(
  text: string,
  opts: { speed?: number } = {},
): Promise<Buffer> {
  const c = await client();
  const response = await c.audio.tts.create({
    input: text,
    voice: "tongtong",
    speed: Math.min(2, Math.max(0.5, opts.speed ?? 1.0)),
    response_format: "wav",
    stream: false,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}
