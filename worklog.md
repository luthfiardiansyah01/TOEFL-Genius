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

---
Task ID: 11
Agent: Main (Z.ai Code)
Task: Refine dark/light mode so all content (text + colored elements) is clearly readable in both themes.

Work Log:
- Used the VLM skill (z-ai vision CLI) to analyze before/after screenshots of both modes.
- Root cause: `--muted-foreground` was too low-contrast in both themes (light 0.5, dark 0.7), making small labels, timestamps, and descriptive sub-text hard to read. Dark mode also had weak card/border separation.
- globals.css theme tuning:
  - LIGHT: `--muted-foreground` 0.5 → 0.44 (darker, stronger on white); `--border` 0.91 → 0.88; `--foreground` 0.21 → 0.22; skill colors slightly deeper for pop.
  - DARK: `--muted-foreground` 0.7 → 0.79 (much lighter, ~7:1 contrast on dark cards); `--card` 0.21 → 0.235 (clearer separation from 0.16 background); `--border` 8% → 13%; `--input` 12% → 17%; `--secondary`/`--muted` 0.26 → 0.29; skill colors brightened (0.68 → 0.72) for visibility on dark.
  - `.bg-grid` made slightly stronger (5% → 7% in dark) so the dashboard hero pattern stays visible.
  - Scrollbar thumb opacity 35% → 45%.
- Dashboard targeted tweaks (dashboard-view.tsx): greeting `text-muted-foreground` → `text-foreground/70 font-semibold`; score section labels → `text-foreground/80 font-semibold`; AI-recommendation reason → `text-foreground/75 font-medium`; tip-of-day text → `text-foreground/85`.
- Confirmed content text (passages, questions, choices, explanations, tutor chat) uses `text-foreground/85-90` which adapts to both modes automatically (~0.88 lightness in dark, ~0.20 in light = WCAG AAA).

VLM verification results (after fix):
- Dark mode dashboard: 9/10 — small labels & sub-text "excellent (9.5/10), ~7:1 contrast, well above WCAG AA"; card separation "good"; scores/charts/colors "excellent (9.5/10)".
- Light mode dashboard: 9/10 — small labels "clearly readable"; only minor aesthetic notes remain.
- Dark mode Reading view (passage + questions + choices): 9/10 — passage "excellent, WCAG AAA", question prompts "perfect 10/10", choices "very good 9/10".
- Light mode Reading view: 9/10 — "exceptionally clean and highly legible".
- `bun run lint` → 0 errors. Dev log → no runtime errors.

Stage Summary:
- Both dark and light modes now have strong, accessible text contrast across all content (dashboard, reading passages, questions, feedback, tutor chat, writing/speaking results). No critical readability failures remain in either theme. Colored elements (skill dots, charts, XP bars, score rings) are vibrant and visible in both modes.

---
Task ID: 12
Agent: Main (Z.ai Code)
Task: Add login & registration system so each user's progress (XP, level, streak, achievements, scores, activities) is tracked under their own account.

Work Log:
- Installed `bcryptjs` + `@types/bcryptjs`. Added `NEXTAUTH_SECRET` + `NEXTAUTH_URL` to `.env`.
- Prisma schema: added `User` model (id, email @unique, name, passwordHash, timestamps) with 1:1 relation to `UserProfile`. Added `userId String? @unique` to `UserProfile` (optional to preserve legacy rows) + `user` relation. Ran `bun run db:push` + `bun run db:generate`.
- `src/lib/auth.ts`: NextAuth v4 config — Credentials provider (bcrypt.compare), JWT session (30-day), callbacks that put user.id into token + session.user.id. Exported `getAuthUserId()` helper using `getServerSession`.
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler (GET + POST).
- `src/app/api/auth/register/route.ts` — validates email/password(≥6)/name, checks duplicate email, bcrypt-hashes password, creates User + linked UserProfile + seeds achievements.
- `src/app/api/auth/me/route.ts` — returns current user {id,name,email} or null.
- `src/lib/profile.ts`: `getProfile(userId)` now requires an authenticated userId; finds profile by userId, creates one linked to the user if missing. Exported `seedAchievements`.
- `src/lib/gamification.ts`: `recordAnswer` + `recordActivity` now accept `userId` and pass it to `getProfile`.
- Updated all 8 protected API routes to read the session via `getAuthUserId()` and return 401 if unauthenticated, then pass userId through: `/api/progress`, `/api/answer`, `/api/writing/evaluate`, `/api/speaking/evaluate`, `/api/recommend`, `/api/achievements`, `/api/tutor`, `/api/activity`. (Routes that don't touch the profile — quiz/generate, mock-test, games/vocab, listening/tts — remain open.)
- `src/lib/providers.tsx`: wrapped app in next-auth `SessionProvider`.
- `src/hooks/use-auth.ts`: `useAuth()` hook combining `useSession` + a `/api/auth/me` react-query check → `{user, loading, authenticated, logout}`.
- `src/components/app/auth-screen.tsx`: premium login/register screen — animated mode-switch pill (Framer Motion layoutId), name/email/password fields, validation, error states, ambient skill-colored glows, feature highlights. After successful sign-in/register it does `window.location.assign("/")` for a clean session propagation.
- `src/app/page.tsx`: gates on `useAuth()` — shows loading splash → AuthScreen (if unauthenticated) → Shell + views (if authenticated).
- `src/components/app/shell.tsx`: added a user avatar (initial) DropdownMenu in the header with "My progress", theme toggle, and "Sign out" (calls `logout`).

End-to-end verification (Agent Browser):
- Fresh session → auth screen renders (Sign in / Create account toggle). ✓
- Register "Andi" (andi@test.com) → auto sign-in → dashboard greets "Andi 👋" with 0 XP, empty activity. ✓
- Andi generates Reading quiz, answers 1 question → "+15 XP" toast, header chip "1 15/120 XP". ✓
- Sign out via account menu → returns to auth screen. ✓
- Register "Budi" (budi@test.com) → fresh dashboard "Budi 👋" with **0 XP** (isolated from Andi's 15). ✓
- Sign out Budi → log back in as Andi → dashboard shows "Andi 👋" with **15 XP persisted**. ✓ (Progress isolation confirmed: Andi 15 XP ≠ Budi 0 XP.)
- Wrong-password login → "Incorrect email or password." error shown. ✓
- `bun run lint` → 0 errors. Dev log → no runtime errors.

Stage Summary:
- Full per-account auth is live: register → auto-login → practice → sign out → login (progress persists). Each account has its own XP, level, streak, score, achievements, activities, weaknesses — completely isolated. GLM-5.3 API keys stay server-side; all progress routes are now session-protected (401 without auth). The single `/` route shows the AuthScreen when logged out and the full app when logged in.

---
Task ID: 13
Agent: Main (Z.ai Code)
Task: Add "Development by MoedaTrace" attribution across the app to make the creator source clear and protect against plagiarism.

Work Log:
- `src/app/layout.tsx` metadata: authors = MoedaTrace (with github URL), creator/publisher/generator = MoedaTrace, copyright = "© MoedaTrace. All rights reserved.", applicationName = "TOEFL Genius", added "MoedaTrace" to keywords, appended "Development by MoedaTrace" to description.
- `src/app/layout.tsx`: added an HTML comment block in <head> with full anti-plagiarism notice (TOEFL Genius / Development by MoedaTrace © 2025 / github URL / "Unauthorized copying or redistribution is prohibited") — visible in page source.
- `src/components/shared/icon.tsx`: added Code, Github, ShieldCheck icons to the icon map.
- `src/components/app/auth-screen.tsx`: added a footer below the feature-highlights grid — "Development by MoedaTrace" (with Code icon) + "© {year} MoedaTrace · Powered by GLM-5.3 · All rights reserved."
- `src/components/app/shell.tsx` desktop sidebar: added a "Development by MoedaTrace" badge (Code icon, bordered pill) below the level ring card at the bottom of the sidebar.
- `src/components/app/shell.tsx` account dropdown menu: added a non-interactive footer line "Development by MoedaTrace" (ShieldCheck icon) after the Sign out item, separated by a divider.
- `src/components/app/shell.tsx` mobile "More" bottom sheet: added a footer block — "Development by MoedaTrace" (Code icon) + "© {year} MoedaTrace · All rights reserved." below the nav grid.

Verification (Agent Browser):
- Auth screen (logged out): footer shows "Development by MoedaTrace" + "© 2026 MoedaTrace · Powered by GLM-5.3 · All rights reserved." ✓
- Desktop sidebar (logged in, 1280px): "Development by MoedaTrace" badge below level card ✓
- Account dropdown menu: "Development by MoedaTrace" footer with ShieldCheck icon ✓
- Mobile "More" sheet (390px): "Development by MoedaTrace" + copyright line ✓
- Meta tags: <meta name="author" content="MoedaTrace"> + <meta name="generator" content="MoedaTrace"> present in HTML head ✓
- Page source: "MoedaTrace" string found in document HTML (comment + rendered) ✓
- `bun run lint` → 0 errors.

Stage Summary:
- "Development by MoedaTrace" attribution is now visible in 4 UI locations (auth screen footer, desktop sidebar, account dropdown, mobile More sheet) + embedded in HTML metadata (author, creator, publisher, generator, copyright) + a source-level HTML comment anti-plagiarism notice. The creator source is unambiguous across both visual and machine-readable layers.

---
Task ID: 14
Agent: Main (Z.ai Code)
Task: Add admin role with account management (email: luth.v.admin@gmail.com, password: 123456789).

Work Log:
- Prisma schema: added `role String @default("USER")` to User model (USER | ADMIN). Ran db:push + db:generate.
- `src/lib/admin-seed.ts`: `ensureAdminAccount()` — idempotently creates the default admin account (luth.v.admin@gmail.com / 123456789, name "Administrator", role ADMIN) + linked profile + seeded achievements. Promotes existing account to ADMIN if needed. Called from the NextAuth `authorize` callback so the admin always exists before login.
- `src/lib/auth.ts`: role now flows through authorize → JWT token → session.user.role. Added `getAuthUser()` (returns id+role+name+email) and `requireAdmin()` (returns the admin user or null).
- `src/app/api/auth/me/route.ts`: now returns `role` in the user object.
- `src/hooks/use-auth.ts`: `useAuth()` now exposes `isAdmin` (user.role === "ADMIN").
- Admin API routes (all guarded by `requireAdmin()` → 403 Forbidden for non-admins):
  - `GET /api/admin/users` — all users with profile stats (xp, level, streak, accuracy, estimatedScore, section scores, lastActivityDate, createdAt).
  - `DELETE /api/admin/users/[id]` — permanently delete a user + cascade. Prevents self-deletion and admin-deletion.
  - `PATCH /api/admin/users/[id]` — reset a user's learning progress (wipes attempts, activities, weaknesses, achievements; zeroes XP/level/streak/scores; re-seeds achievement links). Prevents admin reset.
  - `GET /api/admin/stats` — platform stats: totalUsers, totalAdmins, totalXp, totalQuestions, avgScore, avgAccuracy, activeToday, newThisWeek, tiers (beginner/intermediate/advanced/expert counts).
- `src/components/views/admin-view.tsx`: full admin console — 6 stat cards (Learners, Active today, Total XP, Avg score, Avg accuracy, New/7d), learners-by-tier breakdown, searchable user table (avatar, name+email, ADMIN badge, level/XP/score/accuracy/streak/joined metrics), Reset + Delete buttons with AlertDialog confirmations, toast feedback, loading skeletons.
- `src/lib/types.ts` + `constants.ts`: added "admin" to ViewKey + NAV_ITEMS (group "admin", icon ShieldCheck).
- `src/components/app/shell.tsx`: sidebar shows "Administration" group with Admin item only when `isAdmin`; mobile More sheet filters admin item for non-admins; admin nav uses violet accent.
- `src/app/page.tsx`: client-side guard — `view === "admin" && !isAdmin` falls back to dashboard.
- Added icons (Users, Search, RotateCcw, Mail) to the icon map.

End-to-end verification (Agent Browser):
- Admin login (luth.v.admin@gmail.com / 123456789) → dashboard greets "Administrator 👋", Admin nav visible in sidebar. ✓
- Admin console: 6 stat cards render (3 learners, 1 active today, 101 total XP, avg score 0/120, avg accuracy 100%, 4 new/7d). ✓
- Learners-by-tier breakdown renders. ✓
- User table: lists Administrator (ADMIN badge), Andi, Budi with full stats. ✓
- Search filters by name/email. ✓
- Reset confirmation dialog: "Reset this learner's progress? …wipe all learning data for Budi…" ✓
- Delete confirmation dialog: "Delete this account? …permanently delete Budi…" ✓
- Executed delete on Budi → toast "Budi's account has been deleted.", Budi removed from list. ✓
- Regular user (Andi) login → NO Admin nav item visible. ✓
- Admin API returns `{"error":"Forbidden"}` for non-admin users. ✓
- `bun run lint` → 0 errors. Dev log → no runtime errors.

Stage Summary:
- Full admin role is live: the default admin (luth.v.admin@gmail.com / 123456789) is auto-seeded and can manage all learner accounts — view stats, search users, reset progress, or delete accounts. All admin APIs are server-guarded (403 for non-admins), the admin nav only appears for admins, and a client-side guard prevents non-admins from rendering the admin view. Admins cannot delete their own account or other admin accounts.
