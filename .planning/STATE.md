# Project State

## Status
Phase: 3 (Complete)
Last updated: 2026-05-31

## Project Reference
See: .planning/PROJECT.md

**Core value:** User authenticates once and their CV is automatically sent to every relevant employer in Val Thorens with a personalized email in their name.
**Current focus:** Phase 2

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Auth & Form | ✅ complete |
| 2 | Pipeline | ✅ complete |
| 3 | Real-Time UX | ✅ complete |

## Current Position

**Active phase:** Phase 3 — Real-Time UX (complete)
**Active plan:** —
**Last completed:** 03-01 — app/page.tsx ProgressView (SSE consumer + live log + summary card)

```
Progress: [✓] Phase 1  [✓] Phase 2  [✓] Phase 3
```

## Performance Metrics

- Plans completed: 6
- Phases completed: 3
- Requirements delivered: 48 / 48 (Phase 3 complete)

## Accumulated Context

### Decisions
- Gmail API uses user's OAuth access_token (not server-side key) — emails sent from user's own address
- Service Account used for Sheets writes — no user identity needed
- SSE via ReadableStream — compatible with Next.js App Router, no WebSockets
- @sparticuz/chromium + puppeteer-core — required for Vercel serverless compatibility
- Gemini 2.0 Flash for email generation — free tier, fast, sufficient quality
- Array.from(new Set()) inside page.evaluate() — avoids TypeScript downlevelIteration error
- URL scheme validation (http/https) before page.goto() — mitigates T-02-02-01 Tampering threat
- CandidateData interface omits hasEUPassport — plan contract does not require it for v1
- Content-Transfer-Encoding: quoted-printable added to MIME text part — RFC 2822 best practice
- MIME boundary uses Date.now() + Math.random() suffix for per-call uniqueness
- logToSheets() defers error handling to caller (run/route.ts) — pipeline must not abort on Sheets failure
- URL scheme validated with new URL() + protocol check before calling scrapeEmail() — mitigates T-02-04-02
- authOptions extracted to lib/auth.ts — cleaner single source of truth for NextAuth config; imported by both nextauth route and run/route.ts
- getServerSession(authOptions) with explicit authOptions — required in NextAuth v4 + App Router (omitting authOptions causes getServerSession to always return null)

### Constraints to Keep in Mind
- Vercel `maxDuration: 300` required for run route (Pro plan)
- Scrape route: 60s max
- Places API: 1 req/s between pages
- Gmail API: 4s between sends
- Gemini 429: exponential retry, never abort pipeline
- App stays in Google OAuth Testing mode (up to 5 test users)

### Todos
- none yet

### Blockers
- none yet

## Session Continuity

Next action: All 3 phases complete. Ship to Vercel or run /gsd-code-review 3 --fix to address review findings.
Last session: 2026-05-31 — Completed Phase 3 (03-01: ProgressView SSE consumer). All phases complete.
