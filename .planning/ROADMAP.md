# Roadmap: Val Thorens Job Finder

## Phases

- [ ] **Phase 1: Auth & Form** - User can authenticate with Google and submit their job application data
- [ ] **Phase 2: Pipeline** - App discovers employers, scrapes emails, generates cover emails, sends them, and logs to Sheets
- [ ] **Phase 3: Real-Time UX** - User sees live progress during the pipeline run and a final results summary

---

## Phase Details

### Phase 1: Auth & Form
**Goal**: Users can securely authenticate with Google and submit all data needed to run the pipeline
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06
**Success Criteria** (what must be TRUE):
  1. User lands on home page, clicks sign in, and is redirected to Google OAuth — unauthenticated users cannot see the form
  2. After signing in, user's Gmail address is shown and the form is accessible without entering their email
  3. User can fill name, upload a PDF CV, select job types, enter languages, and set availability dates — then submit
  4. Submitting the form triggers the pipeline; the `access_token` from the session is available to downstream API calls
**Plans**: 3 plans

Plans:
- **Wave 1**
  - [ ] 01-01-PLAN.md — Bootstrap: NextAuth Google OAuth + tailwind custom colors + .env.example + vercel.json
- **Wave 2** *(blocked on Wave 1)*
  - [ ] 01-02-PLAN.md — Page shell: app/page.tsx 3-state component (Login + Loading screens) + root layout
- **Wave 3** *(blocked on Wave 2)*
  - [ ] 01-03-PLAN.md — Form screen: all 5 fields, validation, PDF drag-drop, Base64 conversion, submit handler

**Cross-cutting constraints:**
- NextAuth session callback must expose `access_token` for downstream Gmail API
- CV stays Base64 in-memory only — never persisted to disk

**UI hint**: yes

### Phase 2: Pipeline
**Goal**: The full automated workflow runs end-to-end — every employer in Val Thorens is discovered, contacted where possible, and logged
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, SCRP-01, SCRP-02, SCRP-03, SCRP-04, SCRP-05, GEN-01, GEN-02, GEN-03, GEN-04, SEND-01, SEND-02, SEND-03, SEND-04, SHTS-01, SHTS-02, SHTS-03
**Success Criteria** (what must be TRUE):
  1. After form submission, the app queries Places API with 7 queries, paginates, and produces a deduplicated employer list
  2. Each employer with a website is scraped for contact email; employers without any email are marked skipped without aborting the run
  3. Each employer with an email receives a personalized French email (with CV attachment) sent from the user's own Gmail account; Gemini 429s are retried
  4. Every successful send appends a row (user name, employer name, "No") to the configured Google Sheet
**Plans**: TBD

### Phase 3: Real-Time UX
**Goal**: Users can watch the pipeline run live and get a clear summary of what was sent and what was skipped
**Depends on**: Phase 2
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, PROG-05
**Success Criteria** (what must be TRUE):
  1. The frontend displays a scrollable live log as the pipeline runs — events appear in real time without page refresh
  2. Each SSE event covers the full status spectrum: searching, found count, scraping progress, send status per employer, sheets logging, and completion
  3. At the end of the run, a summary card shows emails sent count, employers skipped count, and Sheets log confirmation
  4. User can click "Volver al formulario" to reset and run the pipeline again
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Form | 0/3 | Planned | - |
| 2. Pipeline | 0/0 | Not started | - |
| 3. Real-Time UX | 0/0 | Not started | - |
