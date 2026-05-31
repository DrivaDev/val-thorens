# Project State

## Status
Phase: 2 (Executing)
Last updated: 2026-05-31

## Project Reference
See: .planning/PROJECT.md

**Core value:** User authenticates once and their CV is automatically sent to every relevant employer in Val Thorens with a personalized email in their name.
**Current focus:** Phase 2

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Auth & Form | ✅ complete |
| 2 | Pipeline | 🗂 planned (5 plans) |
| 3 | Real-Time UX | pending |

## Current Position

**Active phase:** Phase 2 — Pipeline (executing)
**Active plan:** 02-03 (Wave 2 — gemini.ts + gmail.ts)
**Last completed:** 02-02 — lib/places.ts + lib/scraper.ts

```
Progress: [✓] Phase 1  [2/5] Phase 2  [ ] Phase 3
```

## Performance Metrics

- Plans completed: 2
- Phases completed: 0
- Requirements delivered: 11 / 37

## Accumulated Context

### Decisions
- Gmail API uses user's OAuth access_token (not server-side key) — emails sent from user's own address
- Service Account used for Sheets writes — no user identity needed
- SSE via ReadableStream — compatible with Next.js App Router, no WebSockets
- @sparticuz/chromium + puppeteer-core — required for Vercel serverless compatibility
- Gemini 2.0 Flash for email generation — free tier, fast, sufficient quality
- Array.from(new Set()) inside page.evaluate() — avoids TypeScript downlevelIteration error
- URL scheme validation (http/https) before page.goto() — mitigates T-02-02-01 Tampering threat

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

Next action: Continue Phase 2 execution — run plan 02-03 (lib/gemini.ts + lib/gmail.ts).
Last session: 2026-05-31 — Completed 02-02-PLAN.md (lib/places.ts + lib/scraper.ts).
