# Project State

## Status
Phase: 2 (Ready to execute)
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

**Active phase:** Phase 2 — Pipeline (ready to execute)
**Active plan:** None (Phase 2 planned, not started)
**Last completed:** Phase 1 — Auth & Form

```
Progress: [✓] Phase 1  [P] Phase 2  [ ] Phase 3
```

## Performance Metrics

- Plans completed: 0
- Phases completed: 0
- Requirements delivered: 0 / 37

## Accumulated Context

### Decisions
- Gmail API uses user's OAuth access_token (not server-side key) — emails sent from user's own address
- Service Account used for Sheets writes — no user identity needed
- SSE via ReadableStream — compatible with Next.js App Router, no WebSockets
- @sparticuz/chromium + puppeteer-core — required for Vercel serverless compatibility
- Gemini 2.0 Flash for email generation — free tier, fast, sufficient quality

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

Next action: Run `/gsd-execute-phase 2` to execute Phase 2 (5 plans, waves 1→2→3).
