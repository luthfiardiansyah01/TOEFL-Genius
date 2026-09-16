"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Ring } from "@/components/shared/ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgress } from "@/hooks/use-progress";
import { cn } from "@/lib/utils";
import type { SpeakingEvaluation } from "@/lib/types";

const ACCENT = "var(--skill-speaking)";

const PROMPTS = [
  "Describe a person you admire and explain why they have influenced you.",
  "Some people prefer to work alone, others in teams. Which do you prefer and why?",
  "Describe a book that has had a significant influence on you.",
  "Do you agree or disagree: universities should require physical education courses for all students?",
  "Describe your favorite place to relax and explain why it is meaningful to you.",
  "Some people are morning people, others are night people. Which are you and why?",
];

interface EvalState {
  transcript: string;
  evaluation: SpeakingEvaluation;
}

export function SpeakingView() {
  const { celebrate } = useProgress();
  const [promptIndex, setPromptIndex] = useState(0);
  const prompt = PROMPTS[promptIndex];

  // Recording state
  const [status, setStatus] = useState<
    "idle" | "recording" | "stopped" | "submitting" | "done"
  >("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickMimeType(): string {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }

  function shufflePrompt() {
    if (PROMPTS.length <= 1) return;
    let next = promptIndex;
    while (next === promptIndex) {
      next = Math.floor(Math.random() * PROMPTS.length);
    }
    setPromptIndex(next);
    resetAll();
  }

  function resetAll() {
    setResult(null);
    setEvalError(null);
    setPreviewUrl(null);
    setElapsed(0);
    setStatus("idle");
    chunksRef.current = [];
    recordedBlobRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setMicError(null);
    setEvalError(null);
    setResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    chunksRef.current = [];
    recordedBlobRef.current = null;
    setElapsed(0);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicError(
        "Audio recording is not supported in this browser. Try Chrome or Edge.",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const err = e as DOMException;
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setMicError(
          "Microphone access denied. Please allow mic permissions and try again.",
        );
      } else if (err.name === "NotFoundError") {
        setMicError("No microphone was found on this device.");
      } else {
        setMicError(err.message || "Could not access the microphone.");
      }
      return;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      recordedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      // Stop the mic stream so the indicator turns off in the OS.
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("stopped");
  }

  function rerecord() {
    resetAll();
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const commaIdx = dataUrl.indexOf(",");
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      };
      reader.onerror = () => reject(new Error("Failed to encode audio."));
      reader.readAsDataURL(blob);
    });
  }

  async function submitForEvaluation() {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    setStatus("submitting");
    setEvalError(null);
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch("/api/speaking/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, audio: base64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not evaluate your response.");
      }
      setResult({
        transcript: data.transcript || "",
        evaluation: data.evaluation as SpeakingEvaluation,
      });
      setStatus("done");
      celebrate({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        newLevel: data.newLevel,
        unlockedAchievements: data.unlockedAchievements,
        streak: data.streak,
        streakBonus: data.streakBonus,
      });
    } catch (e) {
      setEvalError(e instanceof Error ? e.message : "Evaluation failed");
      setStatus("stopped");
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: ACCENT }}
        >
          <Icon name="Mic" className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Speaking Practice
          </h1>
          <p className="text-xs text-muted-foreground">
            Record your answer and get instant AI feedback.
          </p>
        </div>
      </header>

      {/* Prompt card */}
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Icon name="Quote" className="size-3.5" />
            Prompt {promptIndex + 1} of {PROMPTS.length}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-300">
            <Icon name="Clock" className="size-3" />
            45s prep
          </span>
        </div>
        <p className="text-[15px] font-medium leading-snug sm:text-base">
          {prompt}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Take a moment to gather your thoughts, then record your response.
          </p>
          <Button
            onClick={shufflePrompt}
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={status === "recording" || status === "submitting"}
          >
            <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
            New prompt
          </Button>
        </div>
      </Card>

      {/* Mic permission error */}
      {micError && (
        <div className="flex items-start gap-2 rounded-3xl border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-300">
          <Icon name="XCircle" className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{micError}</p>
            <Button
              onClick={startRecording}
              variant="outline"
              size="sm"
              className="mt-2 rounded-full"
            >
              <Icon name="Mic" className="mr-1.5 size-3.5" />
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Recorder card */}
      {status !== "done" && (
        <Card className="p-4 sm:p-5">
          {status === "recording" ? (
            <div className="flex flex-col items-center gap-4 py-3">
              <div className="relative grid place-items-center">
                <span className="absolute size-20 animate-ping rounded-full bg-rose-500/30" />
                <span className="grid size-20 place-items-center rounded-full bg-rose-500 text-white shadow-lg">
                  <Icon name="Mic" className="size-8" />
                </span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold tabular-nums">
                  {mm}:{ss}
                </p>
                <p className="text-xs text-muted-foreground">Recording…</p>
              </div>
              {/* Live waveform-ish bars */}
              <div className="flex items-end gap-0.5 h-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-rose-500/70"
                    animate={{ height: ["20%", "100%", "40%", "80%", "30%"] }}
                    transition={{
                      duration: 0.8 + (i % 4) * 0.1,
                      repeat: Infinity,
                      repeatType: "mirror",
                    }}
                    style={{ height: "30%" }}
                  />
                ))}
              </div>
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="rounded-full"
              >
                <Icon name="Square" className="mr-1.5 size-4" />
                Stop recording
              </Button>
            </div>
          ) : status === "submitting" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span
                className="grid size-14 place-items-center rounded-2xl text-white"
                style={{ background: ACCENT }}
              >
                <Icon name="Sparkles" className="size-7 animate-pulse" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Transcribing &amp; evaluating…
                </p>
                <p className="text-xs text-muted-foreground">
                  GLM-5.3 is reviewing your pronunciation, fluency and grammar.
                  This usually takes 5–12 seconds.
                </p>
              </div>
              <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              </div>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon name="Volume2" className="size-3.5" />
                Preview your recording
              </div>
              <audio
                ref={audioElRef}
                src={previewUrl}
                controls
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={submitForEvaluation}
                  className="rounded-full"
                  style={{ background: ACCENT }}
                >
                  <Icon name="Send" className="mr-1.5 size-4" />
                  Submit for AI feedback
                </Button>
                <Button
                  onClick={rerecord}
                  variant="outline"
                  className="rounded-full"
                >
                  <Icon name="RefreshCw" className="mr-1.5 size-4" />
                  Re-record
                </Button>
              </div>
              {evalError && (
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-2.5 text-xs text-rose-600 dark:text-rose-300">
                  <Icon name="XCircle" className="size-4 shrink-0" />
                  <span className="flex-1">{evalError}</span>
                  <button
                    onClick={submitForEvaluation}
                    className="rounded-full border border-rose-500/40 px-2 py-0.5 font-semibold hover:bg-rose-500/10"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span
                className="grid size-14 place-items-center rounded-2xl text-white shadow"
                style={{ background: ACCENT }}
              >
                <Icon name="Mic" className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold">Ready to record</p>
                <p className="text-xs text-muted-foreground">
                  Aim for a 45-second response. Speak clearly and naturally.
                </p>
              </div>
              <Button
                onClick={startRecording}
                className="rounded-full"
                style={{ background: ACCENT }}
              >
                <span className="mr-1.5 inline-block size-2 rounded-full bg-white" />
                Start recording
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      <AnimatePresence>
        {status === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Transcript */}
            <Card className="p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Icon name="Quote" className="size-3.5" />
                Transcript
              </div>
              <ScrollArea className="max-h-60 scroll-area-thin pr-3 text-sm leading-relaxed text-foreground/90">
                <p className="whitespace-pre-wrap">
                  {result.transcript || "(no transcript returned)"}
                </p>
              </ScrollArea>
            </Card>

            {/* Evaluation */}
            <SpeakingResultCard evaluation={result.evaluation} />

            <div className="flex justify-center">
              <Button onClick={resetAll} className="rounded-full">
                <Icon name="RefreshCw" className="mr-2 size-4" />
                Try another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpeakingResultCard({
  evaluation: ev,
}: {
  evaluation: SpeakingEvaluation;
}) {
  const score = Math.max(0, Math.min(30, ev.score ?? 0));
  const pct = (score / 30) * 100;
  const metrics = [
    { label: "Pronunciation", value: ev.pronunciation ?? 0 },
    { label: "Fluency", value: ev.fluency ?? 0 },
    { label: "Grammar", value: ev.grammar ?? 0 },
  ];
  return (
    <Card className="p-4 sm:p-5">
      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4">
          <Ring
            value={pct}
            size={120}
            stroke={11}
            barClass="text-amber-500"
          >
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Score
              </p>
              <p className="text-3xl font-extrabold leading-none">{score}</p>
              <p className="text-[10px] text-muted-foreground">/ 30</p>
            </div>
          </Ring>
          <div className="sm:hidden">
            <p className="text-xs text-muted-foreground">TOEFL-style score</p>
            <p className="text-sm font-semibold">From your response</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-full"
              style={{
                background: "color-mix(in oklch, var(--skill-speaking) 18%, transparent)",
                color: "var(--skill-speaking)",
              }}
            >
              {ev.band || "—"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Band rating
            </span>
          </div>
          <div className="grid gap-2.5">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{m.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {m.value}/100
                  </span>
                </div>
                <Progress
                  value={m.value}
                  className="h-2 bg-muted"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Icon name="Sparkles" className="size-3.5" />
          Feedback
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">
          {ev.feedback}
        </p>
      </div>

      {ev.suggestions?.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Icon name="Lightbulb" className="size-3.5" />
            Suggestions
          </p>
          <ul className="flex flex-col gap-1.5">
            {ev.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-2xl bg-amber-500/5 px-3 py-2 text-sm"
              >
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function SpeakingViewSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-12 w-72 rounded-2xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
