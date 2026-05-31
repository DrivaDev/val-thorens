---
phase: 02-pipeline
plan: "04"
subsystem: sheets-and-scrape-endpoint
tags: [google-sheets, service-account, scrape-endpoint, ssrf-mitigation]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [lib/sheets.ts, app/api/scrape/route.ts]
  affects: [02-05]
tech_stack:
  added: [googleapis (sheets v4)]
  patterns: [service-account-auth, post-endpoint-wrapper, url-validation-ssrf]
key_files:
  created:
    - lib/sheets.ts
    - app/api/scrape/route.ts
  modified: []
decisions:
  - logToSheets() defers error handling to caller (run/route.ts) — pipeline must not abort on Sheets failure
  - URL scheme validated with new URL() + protocol check before calling scrapeEmail() — mitigates T-02-04-02
  - scrape endpoint returns 400 for invalid input, 500 for scraping errors — clean HTTP semantics for Wave 3 caller
metrics:
  duration: 8min
  completed: 2026-05-31
  tasks_completed: 2
  files_created: 2
---

# Phase 2 Plan 04: Sheets Logging + Scrape Endpoint Summary

**One-liner:** Google Sheets append via Service Account JSON + standalone POST /api/scrape endpoint with SSRF-mitigated URL validation wrapping scrapeEmail().

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | lib/sheets.ts — logToSheets with Service Account | 74ebcfc | lib/sheets.ts |
| 2 | app/api/scrape/route.ts — POST endpoint wrapping scrapeEmail() | 75bb500 | app/api/scrape/route.ts |

## What Was Built

### lib/sheets.ts

Exports `logToSheets(userName, employerName)` which:
- Parses `GOOGLE_SERVICE_ACCOUNT_JSON` env var into credentials object (SHTS-03)
- Authenticates with `google.auth.GoogleAuth` using minimum scope (`spreadsheets`)
- Appends `[userName, employerName, 'No']` to `Sheet1!A:C` of the hardcoded sheet (SHTS-01, SHTS-02)
- Does not catch errors internally — caller (run/route.ts) must handle gracefully

### app/api/scrape/route.ts

Exports `POST` handler which:
- Validates JSON body presence (400 on parse error)
- Validates `url` field is a non-empty string (400 on missing/invalid)
- Validates URL scheme is `http:` or `https:` using `new URL()` — mitigates SSRF T-02-04-02 (400 on invalid)
- Calls `scrapeEmail(url)` from `@/lib/scraper`
- Returns `{ email: string | null }` with 200 on success
- Returns `{ error: string }` with 500 on scraping failure
- `maxDuration: 60` already configured in `vercel.json` — no change needed

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

All threats addressed per plan threat model:
- T-02-04-01: GOOGLE_SERVICE_ACCOUNT_JSON not logged — JSON.parse errors only log message
- T-02-04-02: SSRF mitigated via `new URL()` + protocol check in scrape endpoint
- T-02-04-03: Accepted — endpoint internal to pipeline, v1 testing mode
- T-02-04-04: Accepted — Service Account scoped to specific shared sheet

No new threat surface introduced beyond what is documented in the plan threat model.

## Known Stubs

None — both modules are fully functional implementations with no placeholder data.

## Self-Check: PASSED

- lib/sheets.ts exists: FOUND
- app/api/scrape/route.ts exists: FOUND
- Commit 74ebcfc exists: FOUND
- Commit 75bb500 exists: FOUND
- npm run build: PASSED (no TypeScript errors, /api/scrape route compiled)
