# Val Thorens Job Finder

## Project

Full-stack Next.js 14 app (App Router + Tailwind, TypeScript) that automates seasonal job applications in Val Thorens. Users log in with Google OAuth, fill a form, and the app discovers employers via Google Places, scrapes their emails, generates personalized French cover emails with Gemini 2.0 Flash, and sends them via the user's Gmail — all streamed in real time via SSE.

**Stack**: Next.js 14 + NextAuth.js v4 + Google OAuth + Gmail API + Google Places API + Puppeteer (@sparticuz/chromium) + Gemini 2.0 Flash + Google Sheets API + Tailwind CSS + Vercel

## GSD Workflow

This project uses the GSD planning framework. Planning docs are in `.planning/`.

**Current state**: See `.planning/STATE.md`
**Roadmap**: See `.planning/ROADMAP.md` (3 phases)
**Requirements**: See `.planning/REQUIREMENTS.md`

### Phase execution

```bash
/gsd-plan-phase 1    # Plan Phase 1 (Auth & Form)
/gsd-execute-phase 1 # Execute Phase 1
/gsd-plan-phase 2    # Plan Phase 2 (Pipeline)
/gsd-execute-phase 2 # Execute Phase 2
/gsd-plan-phase 3    # Plan Phase 3 (Real-Time UX)
/gsd-execute-phase 3 # Execute Phase 3
```

Config: YOLO mode, coarse granularity, parallel execution, verifier enabled.

## Critical Technical Constraints

- **Puppeteer**: MUST use `@sparticuz/chromium` + `puppeteer-core`. Never `puppeteer` full package (Vercel incompatible).
- **SSE**: Use `ReadableStream` in Next.js App Router. No WebSockets.
- **CV storage**: Base64 in memory only during pipeline run. Never persist to disk.
- **NextAuth session**: Must expose `access_token` in session callback for Gmail API.
- **Rate limits**: Places 1 req/s between pages; Gmail 4s between sends; Gemini 429 → exponential retry.
- **Error handling**: Log and continue on individual failures. Never abort the full pipeline.
- **Gmail scope**: `gmail.send` only. Never request inbox read access.

## Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_MAPS_API_KEY=
GOOGLE_GEMINI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

Google Sheet ID hardcoded: `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`

## File Structure

```
app/
  page.tsx                          # Login / Form / Progress (3 states)
  layout.tsx
  globals.css
  api/
    auth/[...nextauth]/route.ts     # NextAuth Google provider
    search/route.ts                 # Google Places API
    scrape/route.ts                 # Puppeteer email scraping
    run/route.ts                    # Pipeline orchestrator + SSE
lib/
  places.ts    gemini.ts    gmail.ts    scraper.ts    sheets.ts
vercel.json                         # maxDuration: 300 (run), 60 (scrape)
```
