---
status: partial
phase: 02-pipeline
source: [02-VERIFICATION.md]
started: 2026-05-31T00:00:00Z
updated: 2026-05-31T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end pipeline run
expected: After form submission with real Google API keys, the app queries Places API (7 queries, pagination), scrapes emails via Puppeteer, generates personalized French emails via Gemini 2.0 Flash, and sends them via Gmail API from the user's own account
result: [pending]

### 2. Gmail delivery verification
expected: Emails arrive in recipient inboxes with correct French body (accents intact), PDF CV attached, subject "Candidature - Saison d'hiver {year} - {name}", sent from user's Gmail address
result: [pending]

### 3. Sheets logging
expected: After each successful send, a row [userName, employerName, "No"] appears in the Google Sheet (ID: 1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek)
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
