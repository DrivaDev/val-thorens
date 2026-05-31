---
phase: 02-pipeline
verified: 2026-05-31T00:00:00Z
status: passed
score: 21/21 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 2: Pipeline Verification Report

**Phase Goal:** The full automated workflow runs end-to-end — every employer in Val Thorens is discovered, contacted where possible, and logged
**Verified:** 2026-05-31
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | After form submission, app queries Places API with 7 queries, paginates, and produces a deduplicated employer list | VERIFIED | `lib/places.ts` contains `VAL_THORENS_QUERIES` (7 entries), `page < 3` pagination loop, `new Map<string, Employer>()` dedup |
| SC-2 | Each employer with a website is scraped for contact email; employers without any email are marked skipped without aborting the run | VERIFIED | `lib/scraper.ts` fully implemented with `scrapeEmail()`; `run/route.ts` increments `skippedCount` and `continue`s when `email` is null or website is absent |
| SC-3 | Each employer with an email receives a personalized French email (with CV attachment) sent from user's own Gmail; Gemini 429s retried | VERIFIED | `lib/gemini.ts` calls `gemini-2.0-flash` with French prompt + `callWithRetry()` with `Math.pow(2, attempt)*1000` delays; `lib/gmail.ts` sends MIME multipart via Gmail API with `Authorization: Bearer` |
| SC-4 | Every successful send appends a row (user name, employer name, "No") to the configured Google Sheet | VERIFIED | `lib/sheets.ts` appends `[userName, employerName, 'No']` to Sheet ID `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek` via googleapis Service Account |

**Score:** 4/4 roadmap success criteria verified

### Plan Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `@sparticuz/chromium`, `puppeteer-core`, `@google/generative-ai`, `googleapis` installed | VERIFIED | `package.json` contains `@sparticuz/chromium@^149.0.0`, `puppeteer-core@^25.1.0`, `@google/generative-ai@^0.24.1`, `googleapis@^173.0.0` |
| 2 | `next.config.mjs` configures `serverComponentsExternalPackages` for Chromium binaries | VERIFIED | `next.config.mjs` line 4: `serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']` |
| 3 | `discoverEmployers()` calls Places API with 7 queries, paginates up to 60 results/query, deduplicates by placeId | VERIFIED | `lib/places.ts`: `VAL_THORENS_QUERIES` (7 items), `do { ... } while (pageToken && page < 3)`, `new Map<string, Employer>()` |
| 4 | `scrapeEmail(url)` opens site with Puppeteer headless (sparticuz/chromium), extracts emails, prioritizes, attempts /contact and /recrutement | VERIFIED | `lib/scraper.ts` lines 14-51: `chromium.setGraphicsMode = false`, `puppeteer.launch({ executablePath: await chromium.executablePath() })`, `mailto:` extraction + regex, fallback loop over `['/contact', '/recrutement']` |
| 5 | Puppeteer browser always closed in `finally` — never zombie | VERIFIED | `lib/scraper.ts` lines 49-52: `finally { await browser.close(); }` |
| 6 | Employers without email return `null` — pipeline continues without aborting | VERIFIED | `lib/scraper.ts` line 48: `return null`; `run/route.ts` line 107-110: `if (!email) { skippedCount++; continue; }` |
| 7 | `generateEmailBody()` calls Gemini 2.0 Flash with French prompt including all GEN-02 elements | VERIFIED | `lib/gemini.ts` lines 17-38: model `'gemini-2.0-flash'`, prompt contains candidate intro, employer-specific interest `"${employer.name}"`, exact availability, languages, `CV se adjunta al email`, cordial closing |
| 8 | Gemini 429 errors trigger exponential retry: 1s, 2s, 4s, max 3 attempts | VERIFIED | `lib/gemini.ts` lines 42-64: `callWithRetry()` with `maxAttempts = 3`, `Math.pow(2, attempt) * 1000`, detects `err?.status === 429 \|\| err?.message?.includes('429')` |
| 9 | `sendEmail()` builds MIME multipart/mixed with text body and PDF attachment encoded in base64 | VERIFIED | `lib/gmail.ts` lines 14-36: `Content-Type: multipart/mixed`, text part + PDF attachment part with `Content-Transfer-Encoding: base64` |
| 10 | base64url applies 3 mandatory replacements: `+→-`, `/→_`, `=` removed | VERIFIED | `lib/gmail.ts` lines 41-45: `.replace(/\+/g, '-')`, `.replace(/\//g, '_')`, `.replace(/=+$/, '')` |
| 11 | `sendEmail()` uses user's OAuth `access_token` to authenticate with Gmail API | VERIFIED | `lib/gmail.ts` line 53: `Authorization: \`Bearer ${params.accessToken}\`` |
| 12 | `logToSheets()` authenticates with Service Account JSON from env var and appends `[userName, employerName, 'No']` to hardcoded Sheet | VERIFIED | `lib/sheets.ts`: `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)`, `google.auth.GoogleAuth`, Sheet ID `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`, `values: [[userName, employerName, 'No']]` |
| 13 | `app/api/scrape/route.ts` accepts POST with `{ url }` and returns `{ email }` or `{ email: null }` using `scrapeEmail()` | VERIFIED | `app/api/scrape/route.ts` lines 1-48: imports `scrapeEmail`, validates URL (http/https), calls `scrapeEmail(url)`, returns `JSON.stringify({ email })` |
| 14 | Google Sheet ID hardcoded as `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek` | VERIFIED | `lib/sheets.ts` line 4: `const SHEET_ID = '1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek'` |
| 15 | POST `/api/run` returns Response with ReadableStream of type `text/event-stream` | VERIFIED | `run/route.ts` lines 164-171: `new ReadableStream(...)`, `'Content-Type': 'text/event-stream'` |
| 16 | Pipeline requires authenticated session — returns 401 if no session | VERIFIED | `run/route.ts` lines 23-29: `getServerSession(authOptions)`, `return new Response(... { status: 401 })` |
| 17 | Pipeline emits all required SSE event types: searching, discovery_complete, scraping, generating, sent, send_error, logged, complete | VERIFIED | `run/route.ts`: all 8 event types present — `searching` (line 86), `discovery_complete` (line 90), `scraping` (lines 99, 105), `generating` (line 114), `sent` (line 129), `send_error` (lines 147, 157), `logged` (line 137), `complete` (lines 152, 158) |
| 18 | Email subject is `Candidature - Saison d'hiver {year} - {name}` | VERIFIED | `run/route.ts` lines 66-67: `const emailSubject = \`Candidature - Saison d'hiver ${currentYear} - ${name}\`` |
| 19 | Pipeline waits 4 seconds between email sends | VERIFIED | `run/route.ts` line 132: `await sleep(4000)` after `sentCount++` |
| 20 | Individual send failures emit `send_error` and pipeline continues | VERIFIED | `run/route.ts` lines 143-148: `catch (employerErr) { ... controller.enqueue(sseEvent({ type: 'send_error', ... })) }` — outer employer loop continues |
| 21 | `complete` event includes `sent` and `skipped` counters | VERIFIED | `run/route.ts` lines 152, 158: `{ type: 'complete', sent: sentCount, skipped: skippedCount }` |

**Score:** 21/21 plan truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | 4 pipeline deps installed | VERIFIED | All 4 present: `@sparticuz/chromium@^149.0.0`, `puppeteer-core@^25.1.0`, `@google/generative-ai@^0.24.1`, `googleapis@^173.0.0` |
| `next.config.mjs` | `serverComponentsExternalPackages` configured | VERIFIED | Contains `serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']` |
| `lib/places.ts` | `discoverEmployers()` + `Employer` interface | VERIFIED | 79 lines, exports both, fully implemented with real Places API call |
| `lib/scraper.ts` | `scrapeEmail()` with Puppeteer serverless | VERIFIED | 91 lines, uses `@sparticuz/chromium`, `try/finally`, fallback paths |
| `lib/gemini.ts` | `generateEmailBody()` + `CandidateData` + retry | VERIFIED | 65 lines, `gemini-2.0-flash`, exponential retry, French prompt |
| `lib/gmail.ts` | `sendEmail()` with MIME + base64url | VERIFIED | 65 lines, MIME construction, 3 base64url replacements, Gmail API fetch |
| `lib/sheets.ts` | `logToSheets()` with Service Account | VERIFIED | 27 lines, Service Account auth, append with hardcoded sheet ID |
| `lib/auth.ts` | `authOptions` extracted (deviation from plan, auto-fixed) | VERIFIED | `lib/auth.ts` created with `export const authOptions: NextAuthOptions` |
| `app/api/scrape/route.ts` | POST endpoint wrapping `scrapeEmail()` | VERIFIED | 48 lines, URL validation (SSRF mitigation), calls `scrapeEmail(url)` |
| `app/api/run/route.ts` | SSE orchestrator with all 4 pipeline stages | VERIFIED | 173 lines, imports all 5 lib modules, `ReadableStream`, all SSE events |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.mjs` | `@sparticuz/chromium` (bundler exclusion) | `serverComponentsExternalPackages` | VERIFIED | Array includes `'@sparticuz/chromium'` and `'puppeteer-core'` |
| `lib/places.ts` | `places.googleapis.com/v1/places:searchText` | `fetch POST` with `X-Goog-Api-Key` | VERIFIED | Line 1: `PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'`; line 40: `fetch(PLACES_ENDPOINT, { method: 'POST', headers: { 'X-Goog-Api-Key': ... } })` |
| `lib/scraper.ts` | `@sparticuz/chromium` | `chromium.executablePath()` + `puppeteer.launch()` | VERIFIED | Line 14: `chromium.setGraphicsMode = false`; line 19: `executablePath: await chromium.executablePath()` |
| `lib/gemini.ts` | Gemini API | `GoogleGenerativeAI` SDK → `model.generateContent()` | VERIFIED | `genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })`, `model.generateContent(prompt)` |
| `lib/gmail.ts` | `gmail.googleapis.com/gmail/v1/users/me/messages/send` | `fetch POST` with `Authorization: Bearer` | VERIFIED | Line 49: exact endpoint; line 53: `Authorization: \`Bearer ${params.accessToken}\`` |
| `lib/sheets.ts` | `sheets.googleapis.com` | `googleapis` → `sheets.spreadsheets.values.append()` | VERIFIED | `google.sheets({ version: 'v4', auth })`, `.spreadsheets.values.append(...)` |
| `app/api/scrape/route.ts` | `lib/scraper.ts` — `scrapeEmail()` | `import scrapeEmail` + direct call | VERIFIED | Line 1: `import { scrapeEmail } from '@/lib/scraper'`; line 37: `scrapeEmail(url)` |
| `app/api/run/route.ts` | `lib/places.ts` — `discoverEmployers()` | import + direct call | VERIFIED | Line 3: `import { discoverEmployers } from '@/lib/places'`; line 88: `discoverEmployers()` |
| `app/api/run/route.ts` | `lib/scraper.ts` — `scrapeEmail()` | import + direct call | VERIFIED | Line 4: `import { scrapeEmail } from '@/lib/scraper'`; line 104: `scrapeEmail(employer.website)` |
| `app/api/run/route.ts` | `lib/gemini.ts` — `generateEmailBody()` | import + direct call | VERIFIED | Line 5: `import { generateEmailBody, CandidateData } from '@/lib/gemini'`; line 115: `generateEmailBody(candidate, ...)` |
| `app/api/run/route.ts` | `lib/gmail.ts` — `sendEmail()` | import + direct call | VERIFIED | Line 6: `import { sendEmail } from '@/lib/gmail'`; line 118: `sendEmail({ ... })` |
| `app/api/run/route.ts` | `lib/sheets.ts` — `logToSheets()` | import + direct call | VERIFIED | Line 7: `import { logToSheets } from '@/lib/sheets'`; line 136: `logToSheets(name, employer.name)` |
| `app/api/run/route.ts` | `lib/auth.ts` — `authOptions` | import + passed to `getServerSession` | VERIFIED | Line 2: `import { authOptions } from '@/lib/auth'`; line 23: `getServerSession(authOptions)` |
| `app/api/auth/[...nextauth]/route.ts` | `lib/auth.ts` | import `authOptions` (refactored in plan 05) | VERIFIED | Line 2: `import { authOptions } from '@/lib/auth'`; avoids circular dependency |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `lib/places.ts` | `allEmployers` (Map) | `fetch` POST to Places API with real `GOOGLE_MAPS_API_KEY` | Yes — real API response parsed into `Employer` objects | FLOWING |
| `lib/scraper.ts` | `emails` array | `page.evaluate()` DOM traversal on live Puppeteer page | Yes — live browser extracting real `mailto:` links and regex matches | FLOWING |
| `lib/gemini.ts` | return value | `model.generateContent(prompt)` with real `GOOGLE_GEMINI_API_KEY` | Yes — live Gemini API call, `.response.text()` returned | FLOWING |
| `lib/gmail.ts` | `encoded` (raw) | `Buffer.from(mimeMessage).toString('base64')` of real MIME message | Yes — real MIME construction from live params | FLOWING |
| `lib/sheets.ts` | (no render, side effect) | `sheets.spreadsheets.values.append()` with Service Account credentials | Yes — real googleapis call | FLOWING |
| `app/api/run/route.ts` | `employers`, SSE events | All five lib modules above, chained | Yes — all data flows through real external API calls | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — the pipeline requires external API keys (Places, Gemini, Gmail, Sheets) and a live Puppeteer binary. No runnable end-to-end check is possible without those credentials. Build verification was done at implementation time (`npm run build` passed per each plan summary). Manual integration testing needed (see Human Verification section).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DISC-01 | 02-02, 02-05 | 7 predefined Places API queries | SATISFIED | `VAL_THORENS_QUERIES` (7 entries) in `lib/places.ts`; all called via `discoverEmployers()` in `run/route.ts` |
| DISC-02 | 02-02, 02-05 | Collects name, address, website, place_id per result | SATISFIED | `Employer` interface: `placeId`, `name`, `address`, `website`; mapped from Places API response fields |
| DISC-03 | 02-02, 02-05 | Paginates up to 60 results per query | SATISFIED | `do { ... } while (pageToken && page < 3)` — 3 pages × 20 = 60 |
| DISC-04 | 02-02, 02-05 | Deduplicates by place_id | SATISFIED | `new Map<string, Employer>()` keyed by `placeId` |
| DISC-05 | 02-02, 02-05 | Rate-limits Places API to 1 req/s between pages | SATISFIED | `if (page > 0) await sleep(1000)` in pagination loop |
| SCRP-01 | 02-02, 02-05 | Opens employer website with Puppeteer headless (sparticuz/chromium) | SATISFIED | `puppeteer.launch({ executablePath: await chromium.executablePath(), headless: true })` |
| SCRP-02 | 02-02, 02-05 | Extracts emails from mailto: links and regex | SATISFIED | `document.querySelectorAll('a[href^="mailto:"]')` + regex `/[a-zA-Z0-9._%+-]+@.../g` in `extractEmails()` |
| SCRP-03 | 02-02, 02-05 | Prioritizes emails by prefix array | SATISFIED | `EMAIL_PRIORITY` array, `prioritizeEmail()` sorts by prefix index |
| SCRP-04 | 02-02, 02-05 | Fallback to /contact and /recrutement | SATISFIED | `for (const path of ['/contact', '/recrutement'])` fallback loop |
| SCRP-05 | 02-02, 02-05 | Employers without email marked skipped, pipeline continues | SATISFIED | `return null` from `scrapeEmail()`; `run/route.ts`: `skippedCount++; continue` |
| GEN-01 | 02-03, 02-05 | Calls Gemini 2.0 Flash per employer with email | SATISFIED | `generateEmailBody(candidate, { name: employer.name })` called for each employer with email |
| GEN-02 | 02-03, 02-05 | Generated email includes all required elements | SATISFIED | Prompt in `lib/gemini.ts` lines 19-36 explicitly requires: intro, interest in establishment, dates, languages, CV attached, cordial closing |
| GEN-03 | 02-03, 02-05 | Subject: `Candidature - Saison d'hiver {year} - {name}` | SATISFIED | `run/route.ts` line 67: `` `Candidature - Saison d'hiver ${currentYear} - ${name}` `` |
| GEN-04 | 02-03, 02-05 | Gemini 429 errors trigger exponential retry | SATISFIED | `callWithRetry()` with `Math.pow(2, attempt) * 1000`, max 3 attempts |
| SEND-01 | 02-03, 02-05 | RFC 2822 MIME with text body and PDF attachment | SATISFIED | `lib/gmail.ts`: `multipart/mixed` with text part + PDF part joined with `\r\n` |
| SEND-02 | 02-03, 02-05 | Gmail API with user OAuth access_token | SATISFIED | `Authorization: \`Bearer ${params.accessToken}\`` in fetch to Gmail API |
| SEND-03 | 02-03, 02-05 | 4 seconds between sends | SATISFIED | `await sleep(4000)` after each successful send in `run/route.ts` |
| SEND-04 | 02-03, 02-05 | Individual send failures logged, pipeline continues | SATISFIED | `catch (employerErr)` increments `skippedCount`, emits `send_error`, pipeline for-loop continues |
| SHTS-01 | 02-04, 02-05 | Appends row to Sheet ID `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek` | SATISFIED | Sheet ID hardcoded in `lib/sheets.ts` line 4 |
| SHTS-02 | 02-04, 02-05 | Columns: A=user name, B=employer name, C="No" | SATISFIED | `values: [[userName, employerName, 'No']]` |
| SHTS-03 | 02-04, 02-05 | Authenticates via Google Service Account JSON env var | SATISFIED | `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)`, `google.auth.GoogleAuth({ credentials })` |

**All 21 requirements: SATISFIED**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/scraper.ts` | 56 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` / `any` type for `page` param | Info | Intentional workaround documented in SUMMARY 02-02 (avoids complex ReturnType inference). No behavioral impact. |

No TODO, FIXME, placeholder comments, empty implementations, or hardcoded empty data found in any pipeline module. All stub-like patterns (e.g., `return null` in `scrapeEmail`) are correct implementations of spec behavior (SCRP-05: no email found = return null).

### Human Verification Required

#### 1. End-to-End Pipeline Run

**Test:** Sign in with Google, fill the form (name, PDF CV, job types, languages, dates), submit
**Expected:** POST /api/run streams SSE events in order: `searching` → `discovery_complete` → per-employer `scraping`/`generating`/`sent`/`send_error` → `complete` with correct counts
**Why human:** Requires live Google API keys (Places, Gemini, Gmail, Sheets), a real Google account with OAuth consent, and a real PDF CV. Cannot be verified without live credentials.

#### 2. Gmail Delivery Verification

**Test:** After a successful run, check that target employer inboxes received the email with PDF attachment
**Expected:** Email arrives with subject `Candidature - Saison d'hiver 2026 - {name}`, body in French, CV.pdf attached
**Why human:** Requires checking actual email delivery to external servers; cannot be verified programmatically.

#### 3. Sheets Logging

**Test:** After a successful run, open Google Sheet `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`
**Expected:** New rows appended with [user name, employer name, "No"] for each successfully sent email
**Why human:** Requires access to the live Google Sheet with the Service Account credentials configured.

#### 4. Gemini 429 Retry Under Load

**Test:** Run the pipeline with enough concurrent Gemini calls to trigger rate limiting
**Expected:** Pipeline continues (with delays), does not crash; retries succeed within 3 attempts
**Why human:** Requires high-volume API calls and live Gemini key; not safe to simulate programmatically.

## Gaps Summary

No gaps. All 21 must-have truths verified in codebase. All 21 requirements (DISC-01 through SHTS-03) satisfied by real implementations with complete data flows and key links wired. The phase goal — every employer in Val Thorens is discovered, contacted where possible, and logged — is achievable with the implemented code once live credentials are configured.

The only outstanding items are the human verification tests requiring live API keys and external service checks, which is expected for a pipeline of this nature.

---

_Verified: 2026-05-31_
_Verifier: Claude (gsd-verifier)_
