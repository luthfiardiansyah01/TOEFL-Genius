# Task 8 — full-stack-developer (subagent B)

## Task
Create 3 frontend view components for the TOEFL Genius Next.js 16 app:
1. `src/components/views/games-view.tsx` — exports `GamesView` (Vocab Match mini game)
2. `src/components/views/mock-test-view.tsx` — exports `MockTestView` (3-section TOEFL simulation)
3. `src/components/views/tutor-view.tsx` — exports `TutorView` (AI chat with GLM-5.3)

## Inputs consumed (from previous agents)
- `worklog.md` — schema, types, API contracts, design system established in Task IDs 1 & 3.
- `src/lib/types.ts` — VocabGameItem, MockTest, MockTestSection, ChoiceQuestion, QuizSet, TutorMessage.
- `src/lib/constants.ts` — XP_REWARDS (gameComplete=25, mockComplete=120, perfectSection=40).
- `src/hooks/use-progress.ts` — `{ celebrate }` helper.
- `src/lib/store.ts` — `useAppStore((s) => s.setView)`.
- `src/components/shared/icon.tsx` — `<Icon name="..." />` helper.
- `src/components/shared/ring.tsx` — `<Ring value size stroke barClass>` for circular progress.
- `src/components/shared/question-runner.tsx` — reused per-section in MockTestView via `sectionToQuizSet()` adapter.
- `src/app/api/{games/vocab,mock-test,tutor,listening/tts,activity,answer}/route.ts` — frozen API contracts.

## Work Log
- Read every relevant existing file (types, constants, hooks, store, shared components, existing views, API routes) before writing code.
- Built `GamesView`:
  - Game picker (active Vocab Match + disabled Grammar Scramble "Coming soon" tile).
  - Vocab Match: 6 word chips / 6 meaning chips in independently shuffled columns; tap-to-match with emerald lock + check + scale burst on correct, shake + red flash on wrong; live MM:SS timer; accuracy/attempts/matched stats bar; round-complete card with confetti burst, +XP (base + speed bonus + accuracy bonus), play-again. Awards XP via `/api/activity` once + `celebrate(...)`.
- Built `MockTestView`:
  - Intro screen → `POST /api/mock-test {sections:3}` with skeleton + retry.
  - Stepper reusing `QuestionRunner` per section (via `sectionToQuizSet` adapter that hides the passage for listening sections so the transcript isn't shown as text). Listening section renders a custom `AudioPlayer` above QuestionRunner that hits `/api/listening/tts`, plays blob, supports replay, revokes URL on cleanup. AnimatePresence horizontal slide between sections; auto-scroll to summary.
  - Results dashboard with Ring (overall %), per-section bars, total XP (per-question sum + mockComplete + perfectSection bonus), performance note, and "New mock test" / "View progress" buttons. Single `/api/activity` call guarded by `loggedRef`.
- Built `TutorView`:
  - Chat card (62vh) with auto-scroll, custom thin scrollbar.
  - User = right-aligned emerald bubbles; assistant = left-aligned card bubbles with gradient Sparkles avatar.
  - Empty state with floating Sparkles + 5 staggered suggested-prompt chips.
  - Auto-growing textarea (max-h-32), 44px Send button, Enter to send / Shift+Enter newline, disabled while sending or empty.
  - Typing indicator = 3 bouncing dots.
  - `react-markdown` with custom component map (p/strong/em/ul/ol/li/code/pre/blockquote/a/h1/h2/h3/hr).
  - Error bubble with inline Retry; Clear chat button in header; conversation kept in local state only.
  - Awards small XP via `/api/tutor` response + `celebrate(...)`.

## Quality checks
- `bunx eslint src/components/views/{games-view,mock-test-view,tutor-view}.tsx` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → 0 errors in the 3 new files (pre-existing errors in shell.tsx, progress-view.tsx, examples/, skills/, api/progress are outside this task's scope).
- Dev log shows successful compiles, no runtime errors when the new files are processed.

## Files created
- `/home/z/my-project/src/components/views/games-view.tsx` (612 lines)
- `/home/z/my-project/src/components/views/mock-test-view.tsx` (734 lines)
- `/home/z/my-project/src/components/views/tutor-view.tsx` (442 lines)

## Notes for the main agent
- No existing files were modified.
- Wire into `src/app/page.tsx` by replacing the `ComingSoon` placeholders for `"games"`, `"mock"`, and `"tutor"` with `<GamesView/>`, `<MockTestView/>`, `<TutorView/>` respectively.
- All three views are `"use client"` components, fully responsive (mobile-first), and reuse the existing shared components (`Icon`, `Ring`, `QuestionRunner`, shadcn/ui primitives).
