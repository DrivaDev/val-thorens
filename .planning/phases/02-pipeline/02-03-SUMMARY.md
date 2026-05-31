---
phase: 02-pipeline
plan: "03"
subsystem: email-generation-and-sending
tags: [gemini, gmail, mime, base64url, retry, oauth]

dependency_graph:
  requires: ["02-01"]
  provides: ["02-04", "02-05"]
  affects: ["app/api/run/route.ts"]

tech_stack:
  added: ["@google/generative-ai"]
  patterns: ["exponential-retry", "mime-multipart-manual", "base64url-encoding", "oauth-bearer-fetch"]

key_files:
  created:
    - lib/gemini.ts
    - lib/gmail.ts
  modified: []

decisions:
  - "CandidateData interface does NOT include hasEUPassport — plan contract omits it for simplicity; run/route.ts will not pass it"
  - "Content-Transfer-Encoding: quoted-printable added to text part — RFC 2822 best practice for UTF-8 body"
  - "boundary includes Math.random() suffix for uniqueness per call (not just Date.now())"

metrics:
  duration: "~12 minutes"
  completed: "2026-05-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 03: Gemini Email Generation + Gmail Send Summary

**One-liner:** Gemini 2.0 Flash generates personalized French cover emails with exponential 429 retry; Gmail API sends MIME multipart with PDF attachment via user's OAuth token and mandatory base64url encoding.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | lib/gemini.ts — Generación de email en francés con retry exponencial | 7e5528b | lib/gemini.ts |
| 2 | lib/gmail.ts — Envío MIME multipart con base64url y access_token OAuth | 5128350 | lib/gmail.ts |

## What Was Built

### lib/gemini.ts
- `CandidateData` interface: name, jobTypes, languages, availFrom, availTo
- `generateEmailBody(candidate, employer)` — calls Gemini 2.0 Flash with a French prompt that includes all GEN-02 elements: candidate intro, employer-specific interest, exact availability dates, languages, explicit CV attachment mention, cordial closing
- `callWithRetry()` — detects HTTP 429 and retries with exponential backoff: 1s → 2s → 4s, max 3 attempts. Non-429 errors propagate immediately.

### lib/gmail.ts
- `SendEmailParams` interface: accessToken, to, subject, body, cvBase64, cvFilename, fromEmail
- `sendEmail(params)` — builds RFC 2822 MIME multipart/mixed message with text body (UTF-8, quoted-printable) and PDF attachment (base64), applies the 3 mandatory base64url replacements (`+→-`, `/→_`, remove `=` padding), sends via `fetch` POST to `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with `Authorization: Bearer accessToken`. Throws on HTTP error for the caller to handle.

## Deviations from Plan

None — plan executed exactly as written. Minor additions:
- `Content-Transfer-Encoding: quoted-printable` header on the text MIME part (RFC 2822 best practice, not present in plan template but harmless)
- `Math.random()` suffix added to boundary (plan template had `Date.now()` only; adding randomness increases uniqueness)

## Known Stubs

None — both modules are complete implementations with no placeholder data.

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covers. The access token is used in `Authorization: Bearer` header only and is never logged (T-02-03-01 compliant). The Gemini API key is consumed server-side only via env var (T-02-03-03 compliant).

## Self-Check: PASSED

- lib/gemini.ts: FOUND
- lib/gmail.ts: FOUND
- Commit 7e5528b: FOUND (feat(02-03): add lib/gemini.ts)
- Commit 5128350: FOUND (feat(02-03): add lib/gmail.ts)
- npm run build: PASSED (no TypeScript errors)
