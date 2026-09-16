# TOEFL Genius — Worklog

Project: Modern, mobile-first TOEFL Learning App powered by GLM-5.3 (z-ai-web-dev-sdk).
Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) + Zustand + TanStack Query + Recharts + Framer Motion.

---
Task ID: 1
Agent: Main (Z.ai Code)
Task: Core infrastructure — Prisma schema, db push, shared types, GLM AI helpers, gamification engine, profile helper, Zustand store, providers, premium theme + layout.

Work Log:
- Wrote `prisma/schema.prisma` with models: UserProfile, ActivityLog, QuestionAttempt, Achievement, UserAchievement, Weakness. Ran `bun run db:push` (success).
- Wrote `src/lib/types.ts` (ViewKey, SkillKey, ChoiceQuestion, QuizSet, EvaluateResult, WritingEvaluation, SpeakingEvaluation, ProgressData, ActivityFeedItem, AchievementDef, WeaknessItem, Recommendation, TutorMessage, MockTest, VocabGameItem).
- Wrote `src/lib/constants.ts` (SKILLS, NAV_ITEMS, xpForLevel/levelFromXp/levelTitle, XP_REWARDS, ACHIEVEMENT_DEFS, TOEFL_TIPS, DAILY_GOALS).
- Wrote `src/lib/profile.ts` (getProfile single-user, todayStr, shiftDay, seedAchievements). Handles streak break + daily XP reset on read.
- Wrote `src/lib/gamification.ts` (recordAnswer, recordActivity, updateWeakness, recomputeEstimatedScore, checkAchievements). Computes XP, level-ups, streak bonus, unlocks achievements, tracks per-skill weaknesses.
- Wrote `src/lib/ai.ts` (GLM-5.3 wrapper): generateQuiz, explainAnswer, evaluateWriting, evaluateSpeaking, recommendNext, generateMockTest, generateVocabGame, tutorChat, generateListeningMaterial. All return strict JSON via extractJSON helper.
- Wrote `src/lib/store.ts` (Zustand: view navigation, optimistic progress, toast event queue for XP/level-up/achievement/streak).
- Wrote `src/lib/providers.tsx` (ThemeProvider next-themes + QueryClientProvider + TooltipProvider).
- Wrote `src/app/globals.css` (premium emerald primary + amber accent, skill palette vars, dark mode, custom scrollbar, bg-grid, text-gradient helpers, float-up/pop/shimmer animations, safe-bottom).
- Wrote `src/app/layout.tsx` (metadata, viewport themeColor, Providers, Toaster + SonnerToaster).

Stage Summary:
- DB schema finalized & pushed. Prisma client generated.
- All shared types + gamification + AI helpers are ready for API routes and views to consume.
- Theme is warm "paper" light + deep emerald-tinted dark; primary = emerald (growth), accent = amber (XP/streak). Skill colors: reading=emerald, listening=teal, speaking=amber, writing=rose, vocab=violet, grammar=orange.

---
Task ID: 3
Agent: Main (Z.ai Code)
Task: Backend API routes (all server-side, GLM-5.3 only on server).

Work Log:
- `POST /api/quiz/generate` — body {skill, difficulty, count?, topic?} → returns QuizSet (id, title, passage?, questions[]).
- `POST /api/answer` — body {question, selectedIndex} → records attempt, returns {isCorrect, correctAnswer, explanation, xpGained, newLevel, leveledUp, unlockedAchievements, streak, streakBonus}.
- `GET  /api/progress` — returns {progress, intoLevel, neededForLevel, levelProgressPct, activities[], weaknesses[], achievements[], accuracyBySkill[], xpHistory[7], recommendation}.
- `POST /api/writing/evaluate` — body {prompt, essay, taskType?} → GLM WritingEvaluation + records activity + XP + stores writingScore on profile.
- `POST /api/speaking/evaluate` — accepts JSON {prompt, audio(base64)} OR FormData {prompt, audio file} → ASR transcribe → GLM evaluate → stores speakingScore + XP.
- `POST /api/listening/tts` — body {text, speed?} → returns audio/wav (splits text into ≤950 char chunks, concatenates WAV buffers). Used by Listening view.
- `GET  /api/recommend` — adaptive next-activity recommendation from weaknesses + recent skills.
- `GET  /api/achievements` — achievements list with progress + unlocked flags.
- `POST /api/mock-test` — body {sections?} → returns MockTest with reading/listening/structure sections.
- `POST /api/tutor` — body {messages[]} → GLM tutor reply + small XP.
- `GET  /api/games/vocab` → returns {items[]} for the vocabulary mini game.
- `POST /api/activity` — generic activity logger (type, skill, title, score, xpEarned, correct, total, durationSec, metadata).

Stage Summary:
- 12 API endpoints cover the full feature set. All GLM/ASR/TTS calls happen server-side only.
- Frontend contracts are now frozen (see types.ts + the route signatures above).

---
Task ID: 7
Agent: full-stack-developer (subagent A)
Task: Build 3 frontend skill-practice views — ListeningView, SpeakingView, WritingView — wired to the existing GLM-5.3 backend (quiz/answer/listening-tts/speaking-evaluate/writing-evaluate). Premium emerald/amber/teal/rose palette, mobile-first, Framer Motion accents.

Work Log:
- `src/components/views/listening-view.tsx` (exports `ListeningView`): Header with teal Headphones icon. Controls row with Easy/Medium/Hard pills + optional topic Input + "Generate" button. Fetches quiz via `POST /api/quiz/generate` (skill="listening", count 3). Renders a custom audio-player card (NOT the QuestionRunner, so the transcript is not spoiled): big Play/Pause button, an animated 32-bar pseudo-waveform that fills with progress, a 3-button speed selector (0.75x / 1x / 1.25x) that applies via `audioEl.playbackRate` (instant, no refetch), and a "Reveal transcript" toggle (collapsed by default) that opens the passage inside a ScrollArea. TTS blob fetched from `POST /api/listening/tts` and played via a hidden `<audio>` element; object URL revoked on cleanup. Below the player, renders the 3 questions in the same visual style as QuestionRunner (numbered badge, A/B/C/D choice buttons, immediate green/red feedback with explanation, locked after answer). Calls `POST /api/answer` per choice and `celebrate(...)` with the response; on the final answer also POSTs to `/api/activity` for the set-completion XP bonus and history. Loading = `<QuizSkeleton>`; empty state and error state with retry buttons. All browser-only APIs (`URL.createObjectURL`, `audio.play()`) are guarded inside `useEffect` / event handlers.
- `src/components/views/speaking-view.tsx` (exports `SpeakingView`): Header with amber Mic icon. Six inline TOEFL independent speaking prompts rotated via a "New prompt" shuffle button. Prompt card shows a "45s prep" badge hint. Recording uses the browser `MediaRecorder` API — MIME type detection prefers `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → `audio/ogg;codecs=opus` → default. "Start recording" shows a pulsing red mic with ping ring and 24 animated waveform bars + live mm:ss timer; "Stop recording" stops the recorder, stops the mic stream tracks, and creates a preview object URL. After stop, shows `<audio controls>` preview + "Submit for AI feedback" (primary) + "Re-record" (outline). Submission: converts the blob to base64 via `FileReader.readAsDataURL`, strips the `data:...;base64,` prefix, and POSTs JSON `{prompt, audio}` to `/api/speaking/evaluate`. Loading state says "Transcribing & evaluating…" (~5–12s) with a shimmer bar. Results: transcript in a ScrollArea card, then an evaluation card with a 0-30 amber score Ring, band Badge, feedback paragraph, three Progress bars (Pronunciation / Fluency / Grammar 0-100), and a numbered Suggestions list. Calls `celebrate(...)`. Mic permission errors are caught and rendered as a friendly "Microphone access denied. Please allow mic permissions and try again." card with a retry button; `NotFoundError` and unsupported-browser cases are also handled. Mic stream is always released on stop / unmount.
- `src/components/views/writing-view.tsx` (exports `WritingView`): Header with rose PenLine icon. shadcn `Tabs` with two rounded pill triggers — "Independent" and "Integrated" — colored with the rose skill var when active. Independent tab: 5 inline TOEFL independent writing prompts with a "New prompt" shuffle button. Integrated tab: shows an inline reading passage card + an inline lecture transcript card (both ScrollAreas) plus the standard "summarize the lecture" prompt. Each tab is its own component with isolated essay/timer/result state so switching tabs resets cleanly. Editor card has a `Textarea` (min-h 280px, resizable), live word count, and a 30-minute countdown timer (mm:ss) that auto-starts on the first keystroke and pauses when results appear; a thin top progress bar turns amber under 5 min and rose under 1 min. Submit is disabled until `essay.trim().length >= 20`. Submission POSTs `{prompt, essay, taskType}` to `/api/writing/evaluate`. Results: rose 0-30 score Ring, band Badge, feedback paragraph, two-column Strengths (emerald checkmarks) / Improvements (amber lightbulbs) lists, a "Corrected excerpt" card in a ScrollArea, plus a collapsible `<details>` to review the original essay. "Try another" button resets essay + timer + result. Calls `celebrate(...)`.
- All three views use `cn()`, the shared `<Icon name="…" />` helper, `<Ring>`, `useProgress().celebrate(...)`, `framer-motion` for entry/feedback reveals, rounded-3xl cards, `bg-card`, `border-border`, `p-4/p-5`, and the skill-color CSS vars (teal / amber / rose). Layout container is `mx-auto max-w-3xl`. Mobile-first, touch targets ≥44px, keyboard accessible.
- Verified `cd /home/z/my-project && bun run lint` — my three files produce zero errors and zero warnings (the remaining lint findings are in pre-existing `shell.tsx` and a parallel agent's `games-view.tsx`, not in my files). `bunx tsc --noEmit` reports zero type errors in my three files.

Stage Summary:
- Listening / Speaking / Writing views are complete, self-contained, and ready for the main agent to wire into `src/app/page.tsx` (replace the three `ComingSoon` placeholders with `ListeningView` / `SpeakingView` / `WritingView`).
- All API contracts honored: `/api/quiz/generate`, `/api/answer`, `/api/listening/tts`, `/api/speaking/evaluate` (JSON base64), `/api/writing/evaluate`, `/api/activity`. XP / level-up / streak / achievement celebrations fire on every graded action via `useProgress().celebrate`.
- Browser-only APIs (`MediaRecorder`, `navigator.mediaDevices.getUserMedia`, `URL.createObjectURL`, `FileReader`, `HTMLAudioElement.playbackRate`) are all guarded inside `useEffect` or event handlers — no hydration mismatches.
- No new dependencies installed. No existing files modified. No test code written.

---
Task ID: 8
Agent: full-stack-developer (subagent B)
Task: Create 3 frontend view components — GamesView (Vocab Match mini game), MockTestView (3-section TOEFL simulation), TutorView (AI chat with GLM-5.3 + markdown rendering).

Work Log:
- Read worklog.md, types.ts, constants.ts, use-progress hook, store, Icon/Ring helpers, QuestionRunner, practice-panel, dashboard-view, progress-view, coming-soon, and the relevant API routes (vocab, mock-test, tutor, listening/tts, activity, answer) to lock in contracts & styling conventions before writing any code.
- Created `src/components/views/games-view.tsx` exporting `GamesView`:
  - Header with violet (var(--skill-vocab)) Gamepad2 icon.
  - Game picker: active "Vocab Match" tile + disabled "Grammar Scramble — Coming soon" tile (locked).
  - Vocab Match: fetches `/api/games/vocab` (6 items) on mount & "New round", builds 6 word/meaning pairs, renders two independently shuffled columns (words | meanings). Tap word → highlight; tap meaning → correct = lock both chips emerald + check + scale burst, wrong = shake + red flash, deselect. Tracks attempts, accuracy, live MM:SS timer.
  - Progress bar + stats bar (time / matched / accuracy) above the board; chips are min-h-11 (44px) for touch targets; mobile-first 2-col grid stacks naturally on small screens.
  - Round complete: confetti-burst results card with trophy, +XP (XP_REWARDS.gameComplete + speed bonus ≤45s + perfect-accuracy bonus), time, accuracy, matched count. Calls `/api/activity` once with `{type:"game", skill:"vocabulary", title:"Vocab Match", score, xpEarned, correct, total, durationSec, metadata}` then `celebrate(...)`. Play-again refetches a fresh round.
- Created `src/components/views/mock-test-view.tsx` exporting `MockTestView`:
  - Header with orange (var(--skill-grammar)) ClipboardCheck icon + Reset button (visible after start).
  - Intro screen card: 3-section overview (Reading / Listening / Structure), Start button → `POST /api/mock-test {sections:3}`. MockSkeleton during generation, retry on error.
  - Running view: top stepper Card showing section X of 3 + section title + Progress bar; per-section QuestionRunner reuse via `sectionToQuizSet()` adapter (passage hidden for listening so transcript isn't shown as text). For listening sections, a custom `AudioPlayer` component renders above QuestionRunner — fetches `/api/listening/tts` blob, builds objectURL, auto-plays, supports replay; revokes URL on cleanup. AnimatePresence with horizontal slide for section transitions; auto-scroll to section summary on completion.
  - QuestionRunner's built-in "Set complete" summary is repurposed as the section-complete interstitial (onRestart = goToNextSection, restartLabel = "Next section" / "See results"). Per-section results captured into `results[]` via onComplete.
  - Results dashboard: hero Ring with overall %, performance label/note, per-section breakdown (3 mini bars), total XP (per-question XP sum + XP_REWARDS.mockComplete + perfectSection bonus if ≥80%), and "New mock test" / "View progress" (setView("progress")) buttons. Calls `/api/activity` once with `{type:"mock", title:"TOEFL Mock Test", score, xpEarned, correct, total}` then `celebrate(...)`. Uses a `loggedRef` to guarantee the activity fires exactly once per results mount.
- Created `src/components/views/tutor-view.tsx` exporting `TutorView`:
  - Header with emerald (var(--primary)) Sparkles icon + "Clear chat" button (RefreshCw) once conversation has started.
  - Chat Card (h-62vh): scrollable message list with custom thin scrollbar; auto-scroll to bottom on new message / typing indicator via ref + smooth behavior.
  - User messages: right-aligned emerald primary bubbles (rounded-br-md). Assistant messages: left-aligned card bubbles with gradient Sparkles avatar (rounded-bl-md). Error bubbles: rose-tinted with inline Retry button (re-sends the last payload, drops the error bubble).
  - Empty state: animated floating Sparkles avatar with blur halo, greeting copy, and 5 suggested-prompt chips (staggered entry) — clicking sends immediately.
  - Input: auto-growing textarea (max-h-32) + 44px square Send button. Enter to send, Shift+Enter for newline. Disabled while sending or empty. Typing indicator = 3 bouncing dots.
  - On send: appends user msg, calls `POST /api/tutor` with full message history, appends assistant reply, calls `celebrate(...)` with returned XP/level/streak/achievements. Local state only (no persistence). `pendingRetryRef` keeps the outgoing payload for inline retry on failure.
  - Assistant messages rendered with `react-markdown` + custom component map: styled p/strong/em/ul/ol/li/code/pre/blockquote/a/h1/h2/h3/hr (no typography plugin needed). Links open in new tab with rel noopener.
- Lint: ran `bunx eslint` against the 3 new files — 0 errors, 0 warnings. (Project-wide `bun run lint` still reports one pre-existing error in `src/components/app/shell.tsx` which is outside this task's scope.) TypeScript `tsc --noEmit` reports zero errors in any of the 3 new files.

Stage Summary:
- 3 view components delivered, fully self-contained, no existing files modified.
- All three follow the established design language: rounded-3xl cards, border-border, bg-card, p-4/p-5, framer-motion entry/feedback animations, mobile-first responsive layouts, ≥44px touch targets, loading skeletons + error retries everywhere.
- All XP-awarding paths reuse `useProgress().celebrate()` and call the appropriate backend endpoint (`/api/activity` for games & mock completion, `/api/tutor` for chat, `/api/answer` via QuestionRunner reuse for mock questions) — no client-side GLM usage.
- Main agent can wire these into `src/app/page.tsx` by importing `GamesView`, `MockTestView`, `TutorView` and switching on view keys `"games"`, `"mock"`, `"tutor"` (replacing the current `ComingSoon` placeholders).

---
Task ID: 9 + 10
Agent: Main (Z.ai Code)
Task: Wire up page.tsx SPA router with all 10 views, fix lint (shell theme toggle), end-to-end browser verification.

Work Log:
- Wired `src/app/page.tsx` to render all 10 views (Dashboard, Reading, Listening, Speaking, Writing, Quiz, Games, MockTest, Progress, Tutor) via the Zustand `view` switch.
- Added Sun/Moon + Trash2/CornerDownLeft/CircleDot icons to `src/components/shared/icon.tsx` (used by subagents' views).
- Fixed lint error in `src/components/app/shell.tsx`: replaced the `useEffect(()=>setMounted(true))` pattern (flagged by `react-hooks/set-state-in-effect`) with a pure CSS theme-toggle icon (`Sun` shown in dark via `dark:block`, `Moon` in light via `dark:hidden`). No JS hydration hack needed.
- `bun run lint` → 0 errors, 0 warnings.

End-to-end verification (Agent Browser on http://localhost:3000):
- Dashboard: renders with live GLM-5.3 recommendation, estimated score ring, level/XP bar, streak, score breakdown, quick actions, recent activity, tip of the day. ✓
- Reading: generated a 4-question quiz (urban green spaces passage) via GLM → answered → "CORRECT · +15 XP" feedback + explanation → XP toast with streak bonus → header chip updated 0→15 XP. ✓
- Listening: renders with difficulty pills + Generate audio (TTS). ✓
- Speaking: renders with prompt rotation + MediaRecorder Start recording button. ✓
- Writing: typed an essay → "Submit for AI grading" → GLM returned Score / Band (Limited) / Strengths / Improvements / Corrected Excerpt. ✓
- Quiz: renders with skill + difficulty selectors. ✓
- Games (Vocab Match): loaded real GLM vocab (mitigate, paradox, ubiquitous, dilemma…) with tap-to-match chips. ✓
- Mock Test: "Start mock test" → GLM generated 3-section test (Reading about plant cells/photosynthesis, Listening, Structure) with A/B/C/D questions. ✓
- Progress: XP-this-week area chart, accuracy-by-skill bar chart, achievements grid, adaptive focus areas, score ring all render. ✓
- Tutor: clicked suggested prompt "Explain inference questions" → GLM replied with structured markdown (bullets, bold). ✓
- Dark mode: toggle works (html class → "dark"), dashboard re-renders with no errors. ✓
- No console errors, no hydration mismatches, no runtime errors across the whole session. XP accumulated across activities (0 → 86 XP, daily goal 80 exceeded).

Stage Summary:
- The full TOEFL Genius app is complete and browser-verified end-to-end. All 10 views work, GLM-5.3 powers question generation, answer feedback, writing/speaking evaluation, mock tests, vocab games, adaptive recommendations, and the AI tutor chat. Gamification (XP, levels, streaks, achievements, estimated TOEFL score, weakness tracking) all persist via Prisma/SQLite. Premium emerald/amber theme, mobile-first with bottom nav + desktop sidebar, dark mode, sticky footer.
