"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SKILLS } from "@/lib/constants";

type Mode = "login" | "register";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Registration failed");
          setBusy(false);
          return;
        }
        // auto sign-in after register
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError("Account created, but sign-in failed. Please log in.");
          setMode("login");
          setBusy(false);
          return;
        }
        // Full reload so the session cookie + useAuth re-evaluate cleanly.
        window.location.assign("/");
        return;
      }

      // login
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Incorrect email or password.");
        setBusy(false);
        return;
      }
      // Full reload so the session cookie + useAuth re-evaluate cleanly.
      window.location.assign("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient skill-colored glows */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-24 -top-24 size-80 rounded-full opacity-20 blur-3xl"
          style={{ background: SKILLS[0].color }}
        />
        <div
          className="absolute -bottom-24 -right-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: SKILLS[2].color }}
        />
        <div
          className="absolute left-1/2 top-1/3 size-72 -translate-x-1/2 rounded-full opacity-10 blur-3xl"
          style={{ background: SKILLS[4].color }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        {/* Brand */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Icon name="GraduationCap" className="size-7" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            TOEFL<span className="text-gradient-emerald"> Genius</span>
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Your AI-powered TOEFL tutor, powered by GLM-5.3.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-xl backdrop-blur">
          {/* Mode switch */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "relative rounded-xl py-2 text-sm font-semibold transition",
                  mode === m
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-pill"
                    className="absolute inset-0 rounded-xl bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">
                  {m === "login" ? "Sign in" : "Create account"}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      className="h-11"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
                minLength={mode === "register" ? 6 : undefined}
                className="h-11"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300"
              >
                <Icon name="XCircle" className="size-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="mt-1 h-11 rounded-xl text-sm font-semibold"
            >
              {busy ? (
                <Icon name="Loader2" className="mr-2 size-4 animate-spin" />
              ) : (
                <Icon
                  name={mode === "login" ? "ArrowRight" : "Rocket"}
                  className="mr-2 size-4"
                />
              )}
              {mode === "login" ? "Sign in" : "Create account & start"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: "Sparkles", label: "AI Tutor" },
            { icon: "Trophy", label: "XP & Levels" },
            { icon: "TrendingUp", label: "Progress" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card/50 p-2.5"
            >
              <Icon name={f.icon} className="size-4 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Attribution */}
        <footer className="mt-6 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Icon name="Code" className="size-3.5 text-primary" />
            Development by{" "}
            <span className="font-bold text-foreground">MoedaTrace</span>
          </div>
          <p className="text-[10px] text-muted-foreground/80">
            © {new Date().getFullYear()} MoedaTrace · Powered by GLM-5.3 · All
            rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
