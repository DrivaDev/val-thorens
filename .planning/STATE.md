# Project State

## Status
Phase: 1 (Executing)
Last updated: 2026-05-29

## Project Reference
See: .planning/PROJECT.md

**Core value:** User authenticates once and their CV is automatically sent to every relevant employer in Val Thorens with a personalized email in their name.
**Current focus:** Phase 1

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Auth & Form | ready (3 plans) |
| 2 | Pipeline | pending |
| 3 | Real-Time UX | pending |

## Current Position

**Active phase:** Phase 1 — Auth & Form (planned, ready to execute)
**Active plan:** Plan 01-03 (Wave 3 — executing)
**Last completed:** —

```
Progress: [P] Phase 1  [ ] Phase 2  [ ] Phase 3
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

Next action: Run `/gsd-execute-phase 1` to execute Phase 1 (3 plans, waves 1→2→3).
