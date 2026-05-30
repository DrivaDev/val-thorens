# Val Thorens Job Finder

## What This Is

A full-stack web app that automates seasonal job applications in Val Thorens, France. Users log in with Google, upload their CV and preferences, and the app finds all employers in Val Thorens via Google Places API, scrapes their contact emails, generates personalized French cover emails with Gemini AI, and sends them via the user's own Gmail account — all in one click.

## Core Value

A job seeker authenticates once and their CV is automatically sent to every relevant employer in Val Thorens with a personalized email in their name.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can log in with Google OAuth (gmail.send scope)
- [ ] User fills a form with name, CV PDF, job type preferences, languages, and availability dates
- [ ] App finds all employers in Val Thorens via Google Places API (7 search queries, deduplicated)
- [ ] App scrapes contact email from each employer's website (Puppeteer + Cheerio)
- [ ] App generates a personalized French email per employer via Gemini 2.0 Flash
- [ ] App sends email + CV PDF attachment from user's Gmail via Gmail API
- [ ] Progress shown in real time via Server-Sent Events (SSE)
- [ ] Each successful send logged to a shared Google Sheet (Service Account)
- [ ] Summary card shown at end: X sent, Y skipped (no email found)

### Out of Scope

- Email inbox reading — only sending (gmail.send scope only)
- Storing CVs persistently — PDF lives in memory during pipeline run only
- Creating Google Sheets — sheet already exists, only append rows
- Mobile app — web only
- Multi-language UI — Spanish only

## Context

- Target users: friends of the developer seeking seasonal ski resort jobs
- App stays in Google OAuth "Testing" mode — no verification needed
- Up to ~5 test users added manually to OAuth consent screen
- Google Sheet ID hardcoded: `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`
- Vercel deployment: `maxDuration: 300` for run route (requires Pro plan); scrape route: 60s
- Puppeteer constraint: MUST use `@sparticuz/chromium` + `puppeteer-core` (Vercel serverless compatible)

## Constraints

- **Tech Stack**: Next.js 14 App Router + Tailwind CSS — specified in brief
- **Auth**: NextAuth.js v4 with Google provider — `access_token` must be exposed in session for Gmail API
- **Scraping**: `@sparticuz/chromium` + `puppeteer-core` only — full `puppeteer` incompatible with Vercel
- **SSE**: ReadableStream (Next.js App Router compatible) — no WebSockets
- **Rate limits**: Places API 1 req/s between pages; Gmail API 4s between sends; Gemini 429 → exponential retry
- **Error handling**: Individual failures log and continue — never abort the pipeline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gmail API via user's OAuth token (not server-side) | Emails sent from user's own address, no third-party email service needed | — Pending |
| Service Account for Sheets (not OAuth) | Sheets writes are server-side, don't need user identity | — Pending |
| SSE over WebSockets | SSE simpler with Next.js App Router ReadableStream | — Pending |
| @sparticuz/chromium over puppeteer | Required for Vercel serverless cold-start compatibility | — Pending |
| Gemini 2.0 Flash for email generation | Free tier available, fast, sufficient quality for cover emails | — Pending |

---
*Last updated: 2026-05-29 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
