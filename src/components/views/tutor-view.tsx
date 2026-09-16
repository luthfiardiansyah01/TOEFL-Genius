"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProgress } from "@/hooks/use-progress";
import type { TutorMessage } from "@/lib/types";

const ACCENT = "var(--primary)"; // emerald

const SUGGESTED_PROMPTS = [
  "Explain inference questions in the Reading section.",
  "Tips for writing a strong independent essay.",
  "How is the Speaking section scored?",
  "Common TOEFL vocabulary themes I should know.",
  "How can I improve my listening note-taking?",
];

interface ChatMessage extends TutorMessage {
  id: string;
  error?: boolean;
}

function uid(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function postTutor(
  messages: TutorMessage[],
): Promise<{ reply: string; xpGained?: number; leveledUp?: boolean; newLevel?: number; unlockedAchievements?: string[]; streak?: number; streakBonus?: number }> {
  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Tutor failed to respond");
  }
  return res.json();
}

export function TutorView() {
  const { celebrate } = useProgress();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingRetryRef = useRef<TutorMessage[] | null>(null);

  // Auto-scroll to bottom on new message or typing indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setLastError(null);
      const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
      const priorMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const outgoing: TutorMessage[] = [...priorMessages, { role: "user", content: trimmed }];
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsSending(true);
      pendingRetryRef.current = outgoing;

      try {
        const data = await postTutor(outgoing);
        const reply: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: data.reply || "Sorry, I couldn't generate a reply.",
        };
        setMessages((prev) => [...prev, reply]);
        celebrate({
          xpGained: data.xpGained,
          leveledUp: data.leveledUp,
          newLevel: data.newLevel,
          unlockedAchievements: data.unlockedAchievements,
          streak: data.streak,
          streakBonus: data.streakBonus,
        });
        pendingRetryRef.current = null;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Tutor failed to respond";
        setLastError(errMsg);
        // Add an error bubble so the user can retry inline
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `I had trouble responding just now — ${errMsg}.`,
            error: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, celebrate],
  );

  const retryLast = useCallback(() => {
    const payload = pendingRetryRef.current;
    if (!payload) return;
    // Remove the error bubble
    setMessages((prev) => prev.filter((m) => !m.error));
    // Re-send the same payload
    void send(payload[payload.length - 1]?.content || "");
  }, [send]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send(input);
      }
    },
    [send, input],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setLastError(null);
    pendingRetryRef.current = null;
    setIsSending(false);
    // focus input
    textareaRef.current?.focus();
  }, []);

  const isEmpty = messages.length === 0;
  const canSend = input.trim().length > 0 && !isSending;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: ACCENT }}
        >
          <Icon name="Sparkles" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">AI Tutor</h1>
          <p className="text-xs text-muted-foreground">Ask GLM-5.3 anything about TOEFL.</p>
        </div>
        {messages.length > 0 && (
          <Button
            onClick={clearChat}
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={isSending}
          >
            <Icon name="RefreshCw" className="mr-1.5 size-3.5" />
            Clear chat
          </Button>
        )}
      </header>

      {/* Chat card */}
      <Card className="flex h-[62vh] min-h-80 flex-col overflow-hidden p-0">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="scroll-area-thin flex-1 overflow-y-auto p-4"
        >
          {isEmpty ? (
            <EmptyState onPick={(p) => void send(p)} />
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onRetry={m.error ? retryLast : undefined} />
                ))}
              </AnimatePresence>
              {isSending && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask your AI tutor… (Enter to send, Shift+Enter for newline)"
              aria-label="Message your AI tutor"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <Button
              onClick={() => void send(input)}
              disabled={!canSend}
              size="icon"
              className="size-11 shrink-0 rounded-2xl"
              aria-label="Send message"
            >
              {isSending ? (
                <Icon name="Loader2" className="size-4 animate-spin" />
              ) : (
                <Icon name="Send" className="size-4" />
              )}
            </Button>
          </div>
          {lastError && (
            <p className="mt-2 px-1 text-[11px] text-rose-500">
              {lastError}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col items-center justify-center gap-5 px-2 py-6 text-center"
    >
      <div className="relative">
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-teal-600 text-white shadow-lg"
        >
          <Icon name="Sparkles" className="size-8" />
        </motion.span>
        <motion.span
          className="absolute -inset-2 -z-10 rounded-3xl bg-primary/20 blur-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div>
        <p className="text-base font-bold">Hi, I&apos;m your TOEFL tutor</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask me anything about strategy, scoring, or specific question types —
          or pick a starter below.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {SUGGESTED_PROMPTS.map((p, i) => (
          <motion.button
            key={p}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            onClick={() => onPick(p)}
            className="group flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-accent"
          >
            <Icon name="Lightbulb" className="size-4 shrink-0 text-amber-500" />
            <span className="flex-1">{p}</span>
            <Icon
              name="ArrowRight"
              className="size-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && <Avatar />}
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[78%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : message.error
              ? "rounded-bl-md border border-rose-500/40 bg-rose-500/5 text-foreground"
              : "rounded-bl-md border border-border bg-card text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="break-words">
            <MarkdownContent content={message.content} />
          </div>
        )}
        {message.error && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-300"
          >
            <Icon name="RefreshCw" className="size-3" />
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Avatar() {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-teal-600 text-white shadow-sm">
      <Icon name="Sparkles" className="size-4" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-end gap-2"
    >
      <Avatar />
      <div className="rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-muted-foreground"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const components = useMemo(
    () => ({
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="leading-relaxed">{children}</p>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-bold">{children}</strong>
      ),
      em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic">{children}</em>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc space-y-1 pl-5">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal space-y-1 pl-5">{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
      code: ({ children }: { children?: React.ReactNode }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          {children}
        </code>
      ),
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="overflow-x-auto rounded-2xl bg-muted p-3 font-mono text-xs">
          {children}
        </pre>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-2 border-primary/50 pl-3 text-foreground/80">
          {children}
        </blockquote>
      ),
      a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          {children}
        </a>
      ),
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="mt-2 text-base font-extrabold">{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="mt-2 text-base font-bold">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="mt-1.5 text-sm font-bold">{children}</h3>
      ),
      hr: () => <hr className="my-3 border-border" />,
    }),
    [],
  );

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
