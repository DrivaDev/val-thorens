---
phase: 2
slug: pipeline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Validation Strategy

No hay Wave 0 — validación manual end-to-end adoptada como estrategia oficial para este pipeline SSE+Puppeteer. La complejidad de mockear Places API, Puppeteer, Gmail API y Gemini en tests unitarios superaría el valor del feedback. Validación: deploy preview + formulario real.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Validación manual (no unit tests) |
| **Config file** | N/A |
| **Quick run command** | `npm run lint` (único check automatizable) |
| **Full suite command** | Deploy preview + ejecución real del pipeline |
| **Estimated runtime** | ~10-15 minutos (pipeline completo con empleadores reales) |

---

## Sampling Rate

- **After every task commit:** `npm run lint`
- **After every plan wave:** `npm run build` (verifica TypeScript sin errores)
- **Before `/gsd-verify-work`:** Deploy preview + run manual del pipeline completo
- **Max feedback latency:** Build < 60 segundos; validación end-to-end manual

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| places-01 | places | 1 | DISC-01..05 | — | Rate-limit 1 req/s entre páginas | build | `npm run build` | ✅ via plan | ⬜ pending |
| scraper-01 | scraper | 2 | SCRP-01..05 | — | Browser always closed en finally | integration | manual | ✅ via plan | ⬜ pending |
| gemini-01 | gemini | 3 | GEN-01..04 | — | Retry exponencial en 429 | build | `npm run build` | ✅ via plan | ⬜ pending |
| gmail-01 | gmail | 3 | SEND-01..04 | — | access_token de sesión OAuth, nunca hardcodeado | build | `npm run build` | ✅ via plan | ⬜ pending |
| sheets-01 | sheets | 3 | SHTS-01..03 | — | Service Account JSON desde env var | build | `npm run build` | ✅ via plan | ⬜ pending |
| run-01 | run | 4 | DISC-01..SHTS-03 | — | Pipeline no aborta en fallos individuales | integration | manual | ✅ via plan | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Puppeteer scraping en Vercel | SCRP-01..05 | Browser headless no ejecutable en unit tests | Deploy preview + enviar formulario real |
| SSE streaming tiempo real | PROG-01..02 | Requiere conexión HTTP persistente | Browser DevTools → Network → EventStream |
| Gmail envío real | SEND-02 | Requiere cuenta Google real + access_token | Verificar bandeja de entrada del empleador de prueba |
| Sheets append real | SHTS-01..03 | Requiere credenciales Service Account reales | Verificar Google Sheet ID configurado |
| Places API discovery | DISC-01..05 | Requiere API key real y resultados de Val Thorens | Verificar que la lista de empleadores retorna >10 resultados |

---

## Validation Sign-Off

- [x] Estrategia de validación manual adoptada — Nyquist satisfecho via build checks + manual E2E
- [x] `wave_0_complete: true` — no hay Wave 0 (estrategia manual declarada)
- [x] `nyquist_compliant: true` — verificación automatizable con `npm run build`; casos complejos via manual
- [ ] All tasks completed per plan
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] Deploy preview funcional — pipeline ejecuta end-to-end

**Approval:** pending
