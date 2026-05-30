---
phase: 01-auth-form
plan: "02"
subsystem: ui-shell
tags: [nextjs, nextauth, tailwind, session, lucide-react]
dependency_graph:
  requires: [01-01]
  provides: [page-shell, login-view, loading-view, form-shell, providers-component]
  affects: [01-03]
tech_stack:
  added: []
  patterns: [nextjs-app-router, nextauth-session-client, tailwind-utility-classes, lucide-icons]
key_files:
  created:
    - val-thorens/app/providers.tsx
  modified:
    - val-thorens/app/page.tsx
    - val-thorens/app/layout.tsx
    - val-thorens/app/globals.css
decisions:
  - "SessionProvider extracted to app/providers.tsx (use client) — keeps RootLayout a Server Component, avoids App Router anti-pattern"
  - "LoginView/FormView/LoadingView as named functions in same file — improves readability and makes PLAN-03 additions clean"
  - "signingIn boolean disables button immediately on click — mitigates T-02-04 double-click DoS"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 01 Plan 02: Page Shell Summary

3-state page shell with Google sign-in login screen, authenticated form shell showing session email, and post-submit loading spinner — all wired to NextAuth session status.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Root layout + globals + providers | 924edbf | app/layout.tsx, app/globals.css, app/providers.tsx |
| 2 | app/page.tsx — Login + Loading + Form shell | 7b1c21a | app/page.tsx |

## What Was Built

- **app/providers.tsx**: `"use client"` wrapper for `SessionProvider` — required by App Router since layout.tsx must be a Server Component
- **app/layout.tsx**: Replaced default Geist font layout with Inter + `<Providers>` wrapper; set `lang="es"`, metadata title `"The Annex — Val Thorens"`
- **app/globals.css**: Reduced to exactly 3 Tailwind directives — no dark mode variables or custom body rules left from scaffold
- **app/page.tsx**: 3-state component with:
  - `LoginView`: card with "The Annex" / "Candidaturas Val Thorens", official Google SVG "G" logo, `signIn('google')` CTA, `signingIn` disable guard (T-02-04)
  - `LoadingView`: `Loader2` spinner with `animate-spin text-french-blue`, `role="status"` + `aria-live="polite"` (accessibility), exact copy strings
  - `FormView` (shell): card header with `session.user?.email` + `signOut()` link; TODO comments for PLAN-03 field additions
  - Auth gate: `status === "authenticated"` guards FormView — unauthenticated users always see LoginView (T-02-01)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

```
grep "unauthenticated\|authenticated" app/page.tsx  → found ✓
grep "Iniciando proceso" app/page.tsx                → found ✓
grep "Candidaturas Val Thorens" app/page.tsx         → found ✓
grep "Iniciar sesion con Google" app/page.tsx        → found ✓
grep "Loader2" app/page.tsx                          → found ✓
grep "animate-spin" app/page.tsx                     → found ✓
grep "session.user" app/page.tsx                     → found ✓
grep 'role="status"' app/page.tsx                    → found ✓
grep "aria-live" app/page.tsx                        → found ✓
npm run build                                        → success ✓
```

## Known Stubs

- `FormView` body contains only TODO comments — intentional per plan spec; PLAN-03 will implement all form fields and submit button.

## Threat Flags

None — all threat mitigations per the plan's threat register are addressed:
- T-02-01: Auth gate on `status === "authenticated"` — FormView never renders when unauthenticated
- T-02-02: Accepted — session.user.email displayed intentionally per AUTH-04
- T-02-03: Accepted — NextAuth manages CSRF state for OAuth redirect
- T-02-04: Mitigated — `signingIn` boolean disables button with `disabled` + `cursor-not-allowed` after first click

## Self-Check: PASSED

Files exist:
- val-thorens/app/providers.tsx — FOUND
- val-thorens/app/layout.tsx — FOUND (modified)
- val-thorens/app/globals.css — FOUND (modified)
- val-thorens/app/page.tsx — FOUND (modified)

Commits exist:
- 924edbf — FOUND (feat(01-02): root layout with SessionProvider...)
- 7b1c21a — FOUND (feat(01-02): 3-state page shell...)
