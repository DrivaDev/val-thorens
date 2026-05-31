---
phase: 02-pipeline
plan: "02"
subsystem: discovery-scraping
tags: [places-api, puppeteer, chromium, serverless, email-scraping, employer-discovery]
dependency_graph:
  requires: [02-01]
  provides: [employer-discovery, email-scraping]
  affects: [lib/places.ts, lib/scraper.ts]
tech_stack:
  added: []
  patterns:
    - "Places API New (v1/places:searchText) con X-Goog-FieldMask header"
    - "Puppeteer serverless con @sparticuz/chromium + chromium.setGraphicsMode = false"
    - "try/finally para garantizar browser.close() en cualquier salida"
    - "Dedup por placeId via Map<string, Employer>"
    - "Email prioritization por prefijo con EMAIL_PRIORITY array"
key_files:
  created:
    - lib/places.ts
    - lib/scraper.ts
  modified: []
decisions:
  - "Array.from(new Set()) en lugar de [...new Set()] dentro de page.evaluate() — evita error de downlevelIteration en TypeScript"
  - "URL scheme validation (http/https) antes de page.goto() — mitiga T-02-02-01 (Tampering)"
  - "extractEmails() tipada con any en lugar del tipo complejo ReturnType — compatible con TypeScript strict mode"
metrics:
  duration: "~2 minutes"
  completed: "2026-05-31"
  tasks_completed: 2
  files_changed: 2
---

# Phase 2 Plan 02: Places + Scraper Summary

## One-Liner

discoverEmployers() consulta 7 queries a Places API New con paginación y dedup por placeId; scrapeEmail() extrae emails con Puppeteer serverless (@sparticuz/chromium), prioriza por prefijo y hace fallback a /contact y /recrutement.

## What Was Built

### Task 1: lib/places.ts — Discovery con Places API New

Implementado `discoverEmployers()` que:
- Itera las 7 queries predefinidas de Val Thorens (hotels, restaurants, bars, ski schools, shops, nightclubs, chalets)
- Pagina hasta 3 páginas por query (20 results/page = máx 60 por query) usando `nextPageToken`
- Aplica `sleep(1000ms)` entre páginas de la misma query para respetar el rate limit de Places API (DISC-05)
- Deduplica empleadores por `placeId` via `Map<string, Employer>`
- Maneja errores por query con try/catch: loguea y continúa, nunca aborta el discovery
- Usa `X-Goog-FieldMask` header con `places.displayName,places.formattedAddress,places.websiteUri,places.id,nextPageToken`

Exporta la interfaz `Employer { placeId, name, address, website }` para consumo en Wave 3 (run/route.ts).

### Task 2: lib/scraper.ts — Puppeteer serverless email scraping

Implementado `scrapeEmail(url)` que:
- Valida que la URL tenga esquema http:// o https:// antes de pasarla a Puppeteer (T-02-02-01)
- Configura `chromium.setGraphicsMode = false` antes de `puppeteer.launch()` (requerido para entornos serverless sin GPU)
- Lanza Chromium con `chromium.args` y `chromium.executablePath()` de `@sparticuz/chromium`
- Usa User-Agent real para evitar bloqueos anti-bot
- Extrae emails de `mailto:` links y por regex en el texto de la página
- Prioriza emails por prefijo según `EMAIL_PRIORITY`: contact > rh > info > jobs > recrutement > emploi > saison
- Hace fallback a `/contact` y `/recrutement` si la homepage no tiene email
- Siempre cierra el browser en bloque `finally` (Pitfall 1 — sin zombie processes)
- Retorna `null` cuando no encuentra email — el caller continúa sin abortar

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `ba63c8a` | feat(02-02): implement lib/places.ts — discoverEmployers() with 7 queries, pagination, dedup |
| Task 2 | `ba49744` | feat(02-02): implement lib/scraper.ts — Puppeteer serverless email scraping |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript downlevelIteration error in page.evaluate()**
- **Found during:** Task 2 — npm run build
- **Issue:** `[...new Set([...emails, ...matches])]` inside `page.evaluate()` caused TypeScript error: "Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher."
- **Fix:** Replaced with `Array.from(new Set(emails.concat(matches)))` — equivalent behavior, no spread on Set
- **Files modified:** lib/scraper.ts (line 73)
- **Commit:** ba49744

**2. [Rule 2 - Security] Added URL scheme validation before Puppeteer goto()**
- **Found during:** Task 2 — threat model review (T-02-02-01 disposition: mitigate)
- **Issue:** The threat register flagged that non-HTTP URLs (e.g., `file://`, `javascript:`) could be passed to `page.goto()` from Places API response data
- **Fix:** Added guard at function entry: rejects any URL not starting with `http://` or `https://`, returns null early
- **Files modified:** lib/scraper.ts (lines 7-10)
- **Commit:** ba49744

**3. [Rule 1 - Bug] Used `any` type for extractEmails page parameter**
- **Found during:** Task 2 — reviewing complex ReturnType inference in plan
- **Issue:** The complex `ReturnType<typeof puppeteer.launch> extends infer B ? ...` type from the plan would fail TypeScript compilation
- **Fix:** Used `any` type as shown in 02-PATTERNS.md line 242 — functionally identical, avoids complex generic chain
- **Files modified:** lib/scraper.ts
- **Commit:** ba49744

## Known Stubs

None. Both modules are fully implemented with real logic.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| T-02-02-01 (mitigated) | lib/scraper.ts | URL passed to page.goto() validated for http/https scheme before use |
| T-02-02-02 (mitigated) | lib/scraper.ts | try/finally with browser.close() + 15s/10s timeouts prevent DoS from hanging pages |
| T-02-02-03 (mitigated) | lib/places.ts | GOOGLE_MAPS_API_KEY only used server-side, not logged |

## Self-Check: PASSED

- [x] `lib/places.ts` exists
- [x] `lib/scraper.ts` exists
- [x] `grep "places.googleapis.com/v1/places:searchText" lib/places.ts` — OK
- [x] `grep "VAL_THORENS_QUERIES" lib/places.ts` — OK (definition + use)
- [x] `grep "sleep(1000)" lib/places.ts` — OK
- [x] `grep "page < 3" lib/places.ts` — OK
- [x] `grep "export interface Employer" lib/places.ts` — OK
- [x] `grep "export async function discoverEmployers" lib/places.ts` — OK
- [x] `grep "chromium.setGraphicsMode = false" lib/scraper.ts` — OK
- [x] `grep "browser.close()" lib/scraper.ts` — OK
- [x] `grep "EMAIL_PRIORITY" lib/scraper.ts` — OK
- [x] `grep "'/contact'" lib/scraper.ts` — OK
- [x] `grep "'/recrutement'" lib/scraper.ts` — OK
- [x] `grep "export async function scrapeEmail" lib/scraper.ts` — OK
- [x] `npm run build` passes without errors
- [x] Commits `ba63c8a` and `ba49744` exist in git log
