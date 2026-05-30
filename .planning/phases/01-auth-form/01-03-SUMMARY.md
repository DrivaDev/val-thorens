---
phase: 01-auth-form
plan: "03"
subsystem: form-ui
tags: [nextjs, react, tailwind, pdf-upload, validation, lucide-react, base64]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [form-view-complete, pdf-upload-base64, submit-handler, form-validation]
  affects: [02-01]
tech_stack:
  added: []
  patterns: [react-controlled-form, filereader-base64, drag-and-drop, inline-validation, onblur-validation]
key_files:
  created: []
  modified:
    - val-thorens/app/page.tsx
decisions:
  - "fetch /api/run fire-and-forget in Phase 1 — onSubmitComplete() called immediately without awaiting fetch response (Phase 2 will wire SSE response)"
  - "FileReader.readAsDataURL used for in-memory Base64 conversion — CV never touches disk per CLAUDE.md constraint"
  - "FormErrors interface includes submit field for network-level errors shown below the submit button"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 01 Plan 03: Form Screen Summary

Complete FormView with 5 validated fields (name, PDF CV with drag-and-drop, 6-checkbox job types, languages, availability dates), Base64 in-memory CV conversion, onBlur + onSubmit validation with per-field inline errors, and submit handler that POSTs to /api/run and transitions immediately to loading state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Form state, field components, and validation logic | a59d2ac | app/page.tsx |
| 2 | Submit handler — validation, Base64 payload, POST /api/run, loading transition | a59d2ac | app/page.tsx |

## What Was Built

- **FormData interface**: `name`, `cv`, `cvBase64`, `jobTypes`, `languages`, `availFrom`, `availTo`
- **FormErrors interface**: per-field error keys including `submit` for network errors
- **5 form fields** with exact UI-SPEC styling, labels, and placeholders:
  - **Nombre completo**: text input with onBlur validation, `border-french-red` on error
  - **CV en PDF**: drag-and-drop dropzone + file input (hidden), validates `application/pdf` + 5MB max; post-upload shows filename + `CheckCircle2` + `X` remove button; `FileReader.readAsDataURL` converts to Base64 stored in `cvBase64` state only
  - **Tipo de trabajo**: 6 checkboxes in `grid-cols-2` — Hotel, Restaurante, Bar, Escuela de ski, Tienda, Otro — `accent-french-blue`
  - **Idiomas**: text input with "Separalos por comas" hint, onBlur validation
  - **Disponibilidad**: two `type="date"` inputs (Desde / Hasta) in `grid-cols-2`
- **validate()** function: returns `FormErrors` with all 5 error strings matching UI-SPEC copywriting contract exactly
- **handleFile()**: validates file type and size client-side; `readAsDataURL` → Base64 → stored in `formData.cvBase64` (in-memory only, never persisted)
- **Drag-and-drop**: `onDragOver` / `onDragLeave` / `onDrop` handlers with `isDragOver` state toggling `border-french-blue bg-blue-50`
- **handleSubmit()**: `e.preventDefault()` → full validation → `setIsSubmitting(true)` → fire-and-forget `fetch("/api/run", { method: "POST", body: JSON.stringify({...cvBase64, accessToken}) })` → immediate `onSubmitComplete()` → loading state
- **Submit button**: `disabled={isSubmitting}` with `opacity-60 cursor-not-allowed`, text toggles to "Enviando..."
- **Accessibility**: dropzone has `role="button"` + `aria-label="Cargar archivo PDF del curriculum"`; X button has `aria-label="Eliminar CV cargado"`; all inputs have `id` with matching `htmlFor` labels
- **Build**: `npm run build` passes with zero TypeScript and ESLint errors

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented in a single atomic commit since they both modify `app/page.tsx` and were completed in the same pass.

## Verification Results

```
grep "readAsDataURL" app/page.tsx                               → 1 match ✓
grep "El nombre es obligatorio" app/page.tsx                   → found ✓
grep "Solo se aceptan archivos PDF de hasta 5 MB" app/page.tsx → found ✓
grep "Selecciona al menos un tipo de trabajo" app/page.tsx     → found ✓
grep "Indica al menos un idioma" app/page.tsx                  → found ✓
grep "Indica las fechas de disponibilidad" app/page.tsx        → found ✓
grep "Arrastra tu CV o haz click" app/page.tsx                 → found ✓
grep "PDF · Max 5 MB" app/page.tsx                             → found ✓
grep "Separalos por comas" app/page.tsx                        → found ✓
grep "Escuela de ski" app/page.tsx                             → found ✓
grep 'role="button"' app/page.tsx                              → found ✓
grep 'aria-label="Cargar archivo PDF del curriculum"' app/page.tsx → found ✓
grep 'aria-label="Eliminar CV cargado"' app/page.tsx           → found ✓
grep "CheckCircle2" app/page.tsx                               → found ✓
grep "5 \* 1024 \* 1024" app/page.tsx                         → found ✓
grep "application/pdf" app/page.tsx                            → found ✓
grep "border-french-red" app/page.tsx                          → found ✓
grep "accent-french-blue" app/page.tsx                         → found ✓
grep "fetch(\"/api/run\"" app/page.tsx                         → found ✓
grep "cvBase64" app/page.tsx                                   → found ✓
grep "accessToken: session.access_token" app/page.tsx          → found ✓
grep "onSubmitComplete" app/page.tsx                           → found ✓
grep "e.preventDefault" app/page.tsx                           → found ✓
grep "Enviar candidatura" app/page.tsx                         → found ✓
grep "Error al iniciar el proceso" app/page.tsx                → found ✓
grep "opacity-60 cursor-not-allowed" app/page.tsx              → found ✓
grep '<form onSubmit={handleSubmit}' app/page.tsx              → found ✓
npm run build                                                  → success ✓
```

## Known Stubs

- **submit handler fetch pattern**: In Phase 1, `/api/run` does not exist — the fetch will fail silently (`.catch()` suppresses the error). `onSubmitComplete()` is called immediately regardless of fetch outcome. Phase 2 will implement the route and Phase 3 will wire up SSE response handling. This is intentional per PLAN-03 spec and ROADMAP.md Phase 1 scope.

## Threat Flags

None new beyond what is documented in the plan's threat register. All mitigations implemented:

| Threat ID | Mitigation Status |
|-----------|-------------------|
| T-03-01 | Client-side PDF validation: `file.type === "application/pdf"` AND `file.size <= 5 * 1024 * 1024`. Phase 2 MUST re-validate server-side. |
| T-03-02 | CV sent to same-origin API only, in-memory during pipeline run, never persisted (FileReader only). |
| T-03-03 | accessToken sent over HTTPS (Vercel enforces). Phase 2 note: never log accessToken in server route. |
| T-03-04 | 5MB client-side check prevents large payloads before fetch. Vercel 4.5MB body limit as backstop. |
| T-03-05 | Accepted — same-origin form, NextAuth cookie is HttpOnly. |

## Self-Check: PASSED

Files exist:
- val-thorens/app/page.tsx — FOUND (modified)

Commits exist:
- a59d2ac — FOUND (feat(01-03): complete FormView with all 5 fields...)
