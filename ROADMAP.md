# TOEFL-Genius Roadmap

## Phase 1 (current) — Summary

Built with Next.js 16 + React 19 + TypeScript, Tailwind + shadcn/ui, Prisma/SQLite, NextAuth (credentials provider), Zustand + TanStack Query, and AI features powered by the third-party `z-ai-web-dev-sdk` ("GLM").

**Delivered:**
- Single-page app (view-switched via Zustand state, all under `/`) covering: Dashboard, Reading, Listening, Speaking, Writing, Quiz, Games, Mock Test, Progress, AI Tutor, and an Admin console.
- ~20 API routes under `src/app/api/` for quiz generation, answer submission, progress, writing/speaking evaluation, listening TTS, recommendations, achievements, mock tests, tutor chat, and admin management.
- Gamification system (XP, levels, streaks, achievements, estimated 0–120 TOEFL score with per-section breakdown) in `src/lib/gamification.ts`.
- Functional auth: email/password register + login, JWT sessions, per-user profile isolation, admin role gating via `requireAdmin()`.
- Prisma schema modeling `User`, `UserProfile`, `ActivityLog`, `QuestionAttempt`, `Achievement`, `UserAchievement`, `Weakness`.

**Known gaps carried into Phase 2** (see below): no automated tests, hardcoded admin credentials, sandbox-specific env/deploy config, AI provider lock-in, no versioned migrations, no deep-linkable routes, repo clutter.

## Phase 2 — Priorities

### 1. Security hardening
- Remove hardcoded admin credentials from `src/lib/admin-seed.ts`; seed via env var or one-time setup flow instead.
- Add rate limiting to `/api/auth/register` and the login endpoint.
- Add password reset and email verification flows.

### 2. AI provider decoupling
- Replace direct dependence on `z-ai-web-dev-sdk` with an internal abstraction layer so a real provider (e.g. Anthropic API) can be swapped in.
- Confirm current AI calls even function outside the z.ai sandbox before relying on them in production.

### 3. Deployment & environment portability
- Fix `.env`: remove the hardcoded Linux sandbox `DATABASE_URL` path, add `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, and provide a `.env.example`.
- Replace sandbox-specific deploy tooling (`Caddyfile`, `.zscripts/*.sh`) with a real pipeline: Dockerfile and/or `vercel.json`, plus CI (GitHub Actions) for lint/build/test on push.

### 4. Testing
- Introduce a test framework (Vitest or Jest) and add coverage for API routes and gamification logic (`src/lib/gamification.ts`) at minimum.
- Consider Playwright for critical user flows (register/login, quiz attempt, mock test).

### 5. Database migrations
- Move from `prisma db push` to versioned `prisma migrate` so schema changes have history and safe rollback.

### 6. Routing
- Convert the single-page, state-switched view system into real Next.js routes per feature for deep-linking, SEO, and easier analytics.

### 7. Housekeeping
- Remove stray screenshot PNGs and the `download/` folder from the repo root.
- Remove the empty `mini-services/` scaffold or fill it in if still planned.
- Remove the unused `next-intl` dependency, or commit to i18n and add locale files.
- Add a proper `README.md` describing setup, stack, and scripts (this file replaces the informal `worklog.md` as the forward-looking plan; keep `worklog.md` as historical dev log).
