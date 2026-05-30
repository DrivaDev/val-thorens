---
phase: 01-auth-form
plan: "01"
subsystem: auth-foundation
tags: [nextauth, google-oauth, tailwind, typescript, vercel]
dependency_graph:
  requires: []
  provides: [nextauth-route, session-access-token, tailwind-colors, env-docs, vercel-config]
  affects: [01-02, 01-03]
tech_stack:
  added: [next-auth@4.24.14, lucide-react@1.17.0]
  patterns: [nextjs-app-router, google-oauth-jwt-session, tailwind-custom-tokens]
key_files:
  created:
    - val-thorens/app/api/auth/[...nextauth]/route.ts
    - val-thorens/types/next-auth.d.ts
    - val-thorens/tailwind.config.ts
    - val-thorens/.env.example
    - val-thorens/vercel.json
    - val-thorens/.gitignore
    - val-thorens/package.json
    - val-thorens/tsconfig.json
    - val-thorens/next.config.mjs
    - val-thorens/postcss.config.mjs
  modified: []
decisions:
  - "Gmail scope locked to gmail.send only — never expanded to broader scopes"
  - "access_token persisted through JWT callback and exposed via session callback for downstream Gmail API calls"
  - "Custom Tailwind colors (french.blue, french.red) added via extend.colors to avoid overriding default palette"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 01 Plan 01: Auth Foundation Summary

NextAuth Google OAuth with gmail.send scope, TypeScript session type augmentation, Tailwind french color tokens, and Vercel function duration config bootstrapped for the Val Thorens Job Finder app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Initialize Next.js 14 + install deps + config | 75b696c | package.json, tailwind.config.ts, .env.example, vercel.json, .gitignore, app/ |
| 2 | NextAuth route + TypeScript session augmentation | b56b919 | app/api/auth/[...nextauth]/route.ts, types/next-auth.d.ts |

## What Was Built

- **Next.js 14 App Router** project scaffolded with TypeScript, Tailwind CSS, and ESLint
- **next-auth@4** and **lucide-react** installed as dependencies
- **Tailwind custom colors**: `french.blue (#0055A4)` and `french.red (#EF4135)` — enables `bg-french-blue`, `text-french-red`, etc.
- **NextAuth Google provider** configured with `gmail.send` scope only (never inbox read)
- **JWT + session callbacks** chain the `access_token` from Google OAuth through to `session.access_token` for use in Phase 2 Gmail API calls
- **TypeScript augmentation** in `types/next-auth.d.ts` so `session.access_token` compiles without errors
- **`.env.example`** documents all Phase 1 env vars plus Phase 2 placeholders
- **`vercel.json`** sets `maxDuration: 300` for the pipeline route and `maxDuration: 60` for scrape
- **`.gitignore`** includes `.env` (not just `.env*.local`) per threat model T-01-05

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added `.env` to .gitignore (not just `.env*.local`)**
- **Found during:** Task 1 — threat model T-01-05 requires `.env` not committed
- **Fix:** Created `.gitignore` with explicit `^\.env$` entry in addition to `.env*.local`
- **Files modified:** `.gitignore`
- **Commit:** 75b696c

**2. [Rule 3 - Blocking] Scaffold done in temp dir then moved (create-next-app rejects non-empty dirs)**
- **Found during:** Task 1 — `create-next-app` refuses to scaffold into a directory with existing files
- **Fix:** Scaffolded into `scaffold-tmp/`, copied all files to project root, removed temp dir
- **Files modified:** All scaffolded files
- **Commit:** 75b696c

**3. [Rule 3 - Blocking] Reinstalled node_modules from scratch after corrupt copy**
- **Found during:** After moving scaffold files, `node_modules/next/dist/bin` was missing
- **Fix:** `rm -rf node_modules && npm install` — full clean reinstall
- **Commit:** no separate commit (node_modules not tracked)

## Verification Results

```
grep -c "0055A4" tailwind.config.ts   → 1 ✓
grep -c "EF4135" tailwind.config.ts   → 1 ✓
grep "gmail.send" app/api/auth/[...nextauth]/route.ts  → found ✓
grep "access_token" types/next-auth.d.ts  → 2 matches ✓
grep "300" vercel.json  → found ✓
grep "^\.env$" .gitignore  → found ✓
npm run build  → success, no TypeScript errors ✓
```

## Known Stubs

None — this plan produces configuration files and foundational code with no UI or data rendering stubs.

## Threat Flags

None — all surfaces are config/infrastructure. The threat model T-01-01 through T-01-05 are fully addressed:
- T-01-01: Scope locked to `gmail.send` only (verified by grep gate)
- T-01-02: access_token stored in NextAuth-encrypted JWT (NEXTAUTH_SECRET from env)
- T-01-03: Accepted — handled by NextAuth v4 built-in CSRF
- T-01-04: Accepted — build-time config, no user input
- T-01-05: Mitigated — `.env` added to `.gitignore`

## Self-Check: PASSED

Files exist:
- val-thorens/app/api/auth/[...nextauth]/route.ts — FOUND
- val-thorens/types/next-auth.d.ts — FOUND
- val-thorens/tailwind.config.ts — FOUND
- val-thorens/.env.example — FOUND
- val-thorens/vercel.json — FOUND

Commits exist:
- 75b696c — FOUND (feat(01-01): scaffold Next.js 14...)
- b56b919 — FOUND (feat(01-01): NextAuth Google provider...)
