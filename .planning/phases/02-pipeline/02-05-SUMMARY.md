---
phase: 02-pipeline
plan: "05"
subsystem: run-pipeline-orchestrator
tags: [sse, pipeline, orchestrator, nextauth, readablestream, gmail, places, scraper, gemini, sheets]
dependency_graph:
  requires: [02-02, 02-03, 02-04]
  provides: [app/api/run/route.ts, lib/auth.ts]
  affects: [03-realtime-ux]
tech_stack:
  added: []
  patterns: [sse-readablestream, pipeline-orchestrator, auth-guard-getserversession, graceful-error-continuation]
key_files:
  created:
    - app/api/run/route.ts
    - lib/auth.ts
  modified:
    - app/api/auth/[...nextauth]/route.ts
decisions:
  - authOptions extracted to lib/auth.ts — cleaner import for both NextAuth route and run/route.ts; avoids circular dependency
  - getServerSession(authOptions) called with explicit authOptions — required in NextAuth v4 + App Router (without it, getServerSession always returns null)
  - Sheets logging wrapped in inner try/catch — non-blocking; email already sent, log failure must not skip skipped counter
  - sleep(4000) placed after sentCount++ and sent SSE event, before Sheets logging — Gmail rate limit honored on each successful send
  - Individual employer errors increment skippedCount and emit send_error — pipeline never aborts, CLAUDE.md constraint honored
metrics:
  duration: 12min
  completed: 2026-05-31
  tasks_completed: 1
  files_created: 2
  files_modified: 1
---

# Phase 2 Plan 05: SSE Pipeline Orchestrator Summary

**One-liner:** ReadableStream SSE orchestrator wiring Places + Puppeteer + Gemini + Gmail + Sheets into a single POST /api/run endpoint with per-employer error isolation.

## What Was Built

`app/api/run/route.ts` — the central endpoint of the product. Accepts POST with candidate form data, verifies session via `getServerSession(authOptions)`, and returns a `ReadableStream` of `text/event-stream` events while executing the 4-stage pipeline in sequence:

1. **Discovery** — calls `discoverEmployers()` (Places API, 7 queries, deduped by placeId)
2. **Scraping** — for each employer with a website, calls `scrapeEmail()` (Puppeteer)
3. **Generation** — calls `generateEmailBody()` (Gemini 2.0 Flash) for employers with scraped email
4. **Send + Log** — calls `sendEmail()` (Gmail API) then `logToSheets()` (Google Sheets), with 4s sleep between sends

`lib/auth.ts` — extracted `authOptions` (NextAuthOptions) so both `app/api/auth/[...nextauth]/route.ts` and `app/api/run/route.ts` can import from a single source of truth.

## SSE Events Emitted

| Event | Payload | Stage |
|-------|---------|-------|
| `searching` | `{ message }` | Discovery start |
| `discovery_complete` | `{ total }` | Discovery end |
| `scraping` | `{ employer, email: string\|null }` | Per employer — one event only |
| `generating` | `{ employer }` | Before Gemini call |
| `sent` | `{ employer, email }` | After successful Gmail send |
| `send_error` | `{ employer, error }` | Any per-employer failure |
| `logged` | `{ employer }` | After Sheets log |
| `complete` | `{ sent, skipped }` | Pipeline end |

## Security Controls Applied (Threat Model)

- **T-02-05-01 (Elevation of Privilege):** `getServerSession(authOptions)` at the top of POST — returns 401 before any pipeline execution if session is absent.
- **T-02-05-03 (Information Disclosure):** `accessToken` and `cvBase64` never logged — only employer names and non-sensitive error messages reach `console.error`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Extract authOptions to lib/auth.ts**
- **Found during:** Task 1 (pre-implementation check per execution context instructions)
- **Issue:** `app/api/auth/[...nextauth]/route.ts` only exported `handler as GET, handler as POST` — `authOptions` was not exported. The plan noted this as a known issue and specified Option (b): extract to `lib/auth.ts`.
- **Fix:** Created `lib/auth.ts` with `export const authOptions: NextAuthOptions`, updated NextAuth route to import from `lib/auth.ts`, and imported from `lib/auth.ts` in `run/route.ts`.
- **Files modified:** `lib/auth.ts` (created), `app/api/auth/[...nextauth]/route.ts` (refactored)
- **Commit:** 6444efe

## Build Verification

`npm run build` passed without errors or new TypeScript warnings. Output confirmed:
- `/api/run` — Dynamic (server-rendered on demand)
- `/api/auth/[...nextauth]` — Dynamic (server-rendered on demand)

## Known Stubs

None — all pipeline stages wire to real lib/* modules with real external API calls.

## Threat Flags

None beyond what is already in the plan's threat model.

## Self-Check: PASSED

- app/api/run/route.ts: FOUND
- lib/auth.ts: FOUND
- Commit 6444efe: FOUND
