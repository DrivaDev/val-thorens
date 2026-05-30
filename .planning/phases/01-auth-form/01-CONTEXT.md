# Phase 1: Auth & Form - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can authenticate with Google OAuth and submit all data needed to run the pipeline: name, PDF CV, job type preferences, languages spoken, and availability dates. The `access_token` from the session must be available for downstream Gmail API calls.

This phase does NOT implement the pipeline, SSE streaming, or results display — those belong to Phase 2 and Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Visual Design
- **D-01:** Theme: French colors (blue, white, red — tricolor) with group identity "The Annex"
- **D-02:** Light mode only — no dark mode
- **D-03:** Form layout: centered card on a subtly colored background — clean, works on mobile and desktop
- **D-04:** Login screen: group name "The Annex" as title + short subtitle (e.g., "Candidaturas Val Thorens") + Sign in with Google button

### CV Upload
- **D-05:** Max PDF size: 5 MB — validated client-side before submission
- **D-06:** Upload interaction: click-to-select + drag-and-drop zone with label "Arrastra tu CV o haz click"
- **D-07:** Post-upload feedback: filename + checkmark icon + remove button (X) to discard and re-upload

### Claude's Discretion
- Form validation style (inline per-field vs. top banner) — Claude decides the most appropriate UX
- Post-submit loading state (while pipeline starts, before Phase 3 SSE) — Claude decides a reasonable spinner/transition
- Exact French tricolor palette values (e.g., `#0055A4` blue, `#FFFFFF` white, `#EF4135` red) — Claude decides exact shades

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-05, FORM-01..FORM-06 are the requirements for this phase

### Roadmap & Goals
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and scope boundary

### Stack & Constraints
- `CLAUDE.md` — Critical constraints: NextAuth.js v4, Next.js 14 App Router, Tailwind CSS, TypeScript; `app/page.tsx` has 3 states (Login / Form / Progress); CV stored in-memory only (never to disk); `access_token` must be exposed via NextAuth session callback; `gmail.send` scope only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the foundational patterns for the project

### Integration Points
- `app/page.tsx` — single-page component managing 3 states: unauthenticated (login), authenticated (form), pipeline running (progress placeholder for Phase 3)
- `app/api/auth/[...nextauth]/route.ts` — NextAuth route with Google provider + session callback exposing `access_token`
- Form submission → calls `app/api/run/route.ts` (to be built in Phase 2) — in Phase 1, just triggers the call and transitions to loading state

</code_context>

<specifics>
## Specific Ideas

- Group name: **"The Annex"** — displayed prominently on login screen and possibly in the form header
- The app is private (Google OAuth Testing mode, up to 5 test users) — no need for public-facing polish beyond the group's use
- UI is Spanish-only (per REQUIREMENTS.md Out of Scope: multi-language UI excluded)
- Job type options (French locale per REQUIREMENTS.md): Hotel, Restaurante, Bar, Escuela de ski, Tienda, Otro

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Auth & Form*
*Context gathered: 2026-05-29*
