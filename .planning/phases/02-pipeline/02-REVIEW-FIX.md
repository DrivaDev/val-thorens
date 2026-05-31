---
phase: 02-pipeline
fixed_at: 2026-05-31T17:14:50Z
review_path: .planning/phases/02-pipeline/02-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-31T17:14:50Z
**Source review:** `.planning/phases/02-pipeline/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (CR-01 through CR-05, WR-01 through WR-06)
- Fixed: 11
- Skipped: 0

## Fixed Issues

### CR-01: Access token taken from untrusted client body

**Files modified:** `app/api/run/route.ts`
**Commit:** 872852b
**Applied fix:** Removed `accessToken` from the request body type and destructuring. Added a session cast `(session as { access_token?: string; ... }).access_token` to read the token from the verified server session. Added 401 guard if no session token is present. Also removed `accessToken` from the required-fields validation check.

---

### CR-02: `/api/scrape` endpoint has no authentication guard

**Files modified:** `app/api/scrape/route.ts`
**Commit:** 505d1f6
**Applied fix:** Added `import { getServerSession } from 'next-auth'` and `import { authOptions } from '@/lib/auth'` at the top. Added session check at the start of the POST handler returning 401 if no session, mirroring the pattern in `run/route.ts`.

---

### CR-03: Prompt injection via unsanitized candidate data

**Files modified:** `app/api/run/route.ts`
**Commit:** 872852b
**Applied fix:** Added server-side field length validation in `run/route.ts` before calling `generateEmailBody`: name <= 100 chars, languages <= 200 chars, each jobType <= 50 chars. Returns 400 with descriptive message if any limit is exceeded.

---

### CR-04: MIME body text part declared as `quoted-printable` but is not encoded

**Files modified:** `lib/gmail.ts`
**Commit:** edab764
**Applied fix:** Added `const bodyB64 = Buffer.from(params.body, 'utf-8').toString('base64')` before the MIME array. Changed `Content-Transfer-Encoding` from `quoted-printable` to `base64`, and replaced `params.body` in the body part with `bodyB64`.

---

### CR-05: `GOOGLE_SERVICE_ACCOUNT_JSON` parsed without error handling

**Files modified:** `lib/sheets.ts`
**Commit:** afc5f3b, 0011924
**Applied fix:** Replaced bare `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)` with: (1) explicit presence check throwing `[sheets] GOOGLE_SERVICE_ACCOUNT_JSON env var is not set`, (2) try/catch around `JSON.parse` throwing `[sheets] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON`. A follow-up commit (0011924) changed the `credentials` type from `unknown` to `any` (with eslint-disable comment) to satisfy the `googleapis` `GoogleAuth` constructor type which does not accept `unknown`.

---

### WR-01: `Subject` header not encoded for non-ASCII names

**Files modified:** `lib/gmail.ts`
**Commit:** edab764
**Applied fix:** Added RFC 2047 base64 encoded-word encoding: `const encodedSubject = \`=?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=\`` and replaced the raw `Subject: ${params.subject}` line with `Subject: ${encodedSubject}`.

---

### WR-02: `From:` header can be empty string if session user email is null

**Files modified:** `app/api/run/route.ts`
**Commit:** 872852b
**Applied fix:** Changed `const fromEmail = session.user?.email ?? ''` to `const fromEmail = session.user?.email` (no fallback) and added an explicit 401 early return if `fromEmail` is falsy, before any pipeline work begins.

---

### WR-03: Rate limit sleep placed after Gmail send instead of before

**Files modified:** `app/api/run/route.ts`
**Commit:** 872852b
**Applied fix:** Removed `await sleep(4000)` from after `sendEmail`. Added `if (sentCount > 0) await sleep(4000)` at the top of the employer loop body, before ETAPA 2 (SCRAPING). This ensures the delay guards the start of the next send rather than padding the logging step.

---

### WR-04: Places API rate limit skips delay between query transitions

**Files modified:** `lib/places.ts`
**Commit:** f779e2f
**Applied fix:** Added `let requestCount = 0` before the query loop. Inside the do-while, replaced `if (page > 0) await sleep(1000)` with `if (requestCount > 0) await sleep(1000); requestCount++`. The `page` variable was retained for the existing `page < 3` max-pages guard.

---

### WR-05: Unreachable `throw new Error('[gemini] Max retries exceeded')`

**Files modified:** `lib/gemini.ts`
**Commit:** 28d12dd
**Applied fix:** Replaced the misleading error message with a comment explaining it is dead code required only for TypeScript's exhaustive flow analysis, and changed the message to `'[gemini] unreachable: all attempts exhausted'` to accurately reflect its nature.

---

### WR-06: `extractEmails` can produce duplicate emails with mixed casing

**Files modified:** `lib/scraper.ts`
**Commit:** ec05338
**Applied fix:** Replaced the `emails[]` array + late `new Set(emails.concat(matches))` pattern with an incremental `Set<string>` named `seen`. Mailto link emails are added with `seen.add(email.toLowerCase())`. Regex matches are added with `seen.add(e.toLowerCase())`. Returns `Array.from(seen)`. This prevents `Contact@Hotel.com` and `contact@hotel.com` from being treated as distinct addresses.

---

## Build Verification

`npm run build` completed successfully after all fixes. TypeScript compiled with no errors. All 5 routes compile correctly (/, /_not-found, /api/auth/[...nextauth], /api/run, /api/scrape).

---

_Fixed: 2026-05-31T17:14:50Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
