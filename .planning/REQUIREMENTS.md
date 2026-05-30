# Requirements: Val Thorens Job Finder

**Defined:** 2026-05-29
**Core Value:** User authenticates once and their CV is automatically sent to every relevant employer in Val Thorens with a personalized email in their name.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with Google OAuth on the home page
- [ ] **AUTH-02**: OAuth requests `gmail.send` scope so app can send email on user's behalf
- [ ] **AUTH-03**: User's `access_token` is persisted in NextAuth session for Gmail API calls
- [ ] **AUTH-04**: User's email is taken from Google session (not asked in form)
- [ ] **AUTH-05**: Unauthenticated users see login screen; authenticated users see form

### Form

- [ ] **FORM-01**: User can enter full name
- [ ] **FORM-02**: User can upload a CV in PDF format
- [ ] **FORM-03**: User can select one or more job type preferences (Hotel, Restaurante, Bar, Escuela de ski, Tienda, Otro)
- [ ] **FORM-04**: User can enter languages spoken (free text)
- [ ] **FORM-05**: User can enter availability start and end dates
- [ ] **FORM-06**: Submitting the form triggers the full pipeline

### Employer Discovery

- [ ] **DISC-01**: App queries Google Places API (Text Search) with 7 predefined queries for Val Thorens
- [ ] **DISC-02**: App collects name, address, website, and place_id per result
- [ ] **DISC-03**: App paginates up to 60 results per query using next_page_token
- [ ] **DISC-04**: App deduplicates results by place_id
- [ ] **DISC-05**: App rate-limits Places API to 1 request/second between pages

### Email Scraping

- [ ] **SCRP-01**: For each employer with a website, app opens it with Puppeteer headless (sparticuz/chromium)
- [ ] **SCRP-02**: App extracts emails from mailto: links and regex pattern matches
- [ ] **SCRP-03**: App prioritizes emails with prefixes: contact, rh, info, jobs, recrutement, emploi, saison
- [ ] **SCRP-04**: If no email on homepage, app attempts /contact and /recrutement paths
- [ ] **SCRP-05**: Employers without any email are marked as skipped and pipeline continues

### Email Generation

- [ ] **GEN-01**: For each employer with email, app calls Gemini 2.0 Flash to generate a personalized French email body
- [ ] **GEN-02**: Generated email includes: candidate intro, interest in that establishment type, availability, languages, CV attached note, cordial closing
- [ ] **GEN-03**: Email subject is hardcoded: `Candidature - Saison d'hiver {year} - {user name}`
- [ ] **GEN-04**: Gemini 429 errors trigger exponential retry

### Email Sending

- [ ] **SEND-01**: App builds RFC 2822 MIME message with text body and PDF attachment
- [ ] **SEND-02**: App sends email via Gmail API using user's OAuth access_token
- [ ] **SEND-03**: App waits 4 seconds between each send
- [ ] **SEND-04**: Individual send failures are logged and pipeline continues

### Progress & Results

- [ ] **PROG-01**: App streams real-time progress to frontend via SSE (ReadableStream)
- [ ] **PROG-02**: SSE events include: searching, found count, scraping progress, send status per employer, sheets logging, completion summary
- [ ] **PROG-03**: Frontend displays scrollable real-time log
- [ ] **PROG-04**: Summary card shown at end: emails sent count, employers skipped count, sheets logged confirmation
- [ ] **PROG-05**: User can click "Volver al formulario" to run again

### Sheets Logging

- [ ] **SHTS-01**: After each successful send, app appends a row to Google Sheet ID `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`
- [ ] **SHTS-02**: Row columns: A=user name, B=employer name, C="No" (responded)
- [ ] **SHTS-03**: App authenticates to Sheets API via Google Service Account JSON (env var)

## v2 Requirements

### Enhanced Scraping

- **SCRP-V2-01**: Parse LinkedIn, social profiles for contact info when no website email found
- **SCRP-V2-02**: Retry failed scrapes with different user agents

### Analytics

- **ANLT-01**: Admin dashboard showing aggregate sends, response rate per employer
- **ANLT-02**: Track which employers replied (update "Respondido" column in Sheets)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reading user's inbox | gmail.send scope only — privacy, not needed |
| Persisting CVs on server | In-memory only during run — privacy, no storage needed |
| Creating or managing Google Sheets | Sheet already exists, only append |
| Google OAuth verification | App stays in Testing mode for friends only |
| Multi-language UI | Spanish only for intended users |
| Mobile app | Web-first, Vercel deployment sufficient |
| Real-time chat or notifications | Not needed for this use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 - Auth & Form | Pending |
| AUTH-02 | Phase 1 - Auth & Form | Pending |
| AUTH-03 | Phase 1 - Auth & Form | Pending |
| AUTH-04 | Phase 1 - Auth & Form | Pending |
| AUTH-05 | Phase 1 - Auth & Form | Pending |
| FORM-01 | Phase 1 - Auth & Form | Pending |
| FORM-02 | Phase 1 - Auth & Form | Pending |
| FORM-03 | Phase 1 - Auth & Form | Pending |
| FORM-04 | Phase 1 - Auth & Form | Pending |
| FORM-05 | Phase 1 - Auth & Form | Pending |
| FORM-06 | Phase 1 - Auth & Form | Pending |
| DISC-01 | Phase 2 - Pipeline | Pending |
| DISC-02 | Phase 2 - Pipeline | Pending |
| DISC-03 | Phase 2 - Pipeline | Pending |
| DISC-04 | Phase 2 - Pipeline | Pending |
| DISC-05 | Phase 2 - Pipeline | Pending |
| SCRP-01 | Phase 2 - Pipeline | Pending |
| SCRP-02 | Phase 2 - Pipeline | Pending |
| SCRP-03 | Phase 2 - Pipeline | Pending |
| SCRP-04 | Phase 2 - Pipeline | Pending |
| SCRP-05 | Phase 2 - Pipeline | Pending |
| GEN-01 | Phase 2 - Pipeline | Pending |
| GEN-02 | Phase 2 - Pipeline | Pending |
| GEN-03 | Phase 2 - Pipeline | Pending |
| GEN-04 | Phase 2 - Pipeline | Pending |
| SEND-01 | Phase 2 - Pipeline | Pending |
| SEND-02 | Phase 2 - Pipeline | Pending |
| SEND-03 | Phase 2 - Pipeline | Pending |
| SEND-04 | Phase 2 - Pipeline | Pending |
| SHTS-01 | Phase 2 - Pipeline | Pending |
| SHTS-02 | Phase 2 - Pipeline | Pending |
| SHTS-03 | Phase 2 - Pipeline | Pending |
| PROG-01 | Phase 3 - Real-Time UX | Pending |
| PROG-02 | Phase 3 - Real-Time UX | Pending |
| PROG-03 | Phase 3 - Real-Time UX | Pending |
| PROG-04 | Phase 3 - Real-Time UX | Pending |
| PROG-05 | Phase 3 - Real-Time UX | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after roadmap creation*
