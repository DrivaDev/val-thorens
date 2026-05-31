---
phase: 03-real-time-ux
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - app/page.tsx
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: fixed
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-31
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

`app/page.tsx` implements three views (Login, Form, Progress) that together drive the real-time SSE-based pipeline UX. The file is generally well-structured. However, one critical security issue was found: the OAuth access token is needlessly leaked in the POST body sent to `/api/run`. Additionally, five warnings cover an unsafe non-null assertion on the SSE response body, stale closure captures in `onBlur` validators, a stuck `isSubmitting` state on the success path (latent issue), a fragile SSE parser, and dynamically injected `<style>` content incompatible with strict CSP. Two informational items round out the report.

Cross-referencing with `app/api/run/route.ts` confirmed that the server already ignores the client-supplied `accessToken` field and reads the token from `getServerSession` — the token sent from the client is silently discarded server-side, but it is still transmitted over the wire and readable in browser devtools and any intermediate proxy logs.

---

## Critical Issues

### CR-01: OAuth Access Token Unnecessarily Transmitted in POST Body

**File:** `app/page.tsx:591`
**Issue:** `handleSubmit` serializes `accessToken: session.access_token` into the JSON body of the POST request to `/api/run`. The OAuth access token is a bearer credential. Transmitting it in the request body means it appears in browser Network devtools, proxy logs, and any logging middleware that captures request bodies. The server-side handler (`app/api/run/route.ts:32`) correctly ignores this field — it always reads the token from `getServerSession`. The client therefore sends a live credential for no benefit.

If a bug or future refactor causes the server to start consuming the body-supplied token instead of the session token, this pattern becomes a full authentication bypass vector (an attacker who can intercept or replay the body could supply an arbitrary token).

**Fix:** Remove `accessToken` from the POST body entirely. The server already validates the session independently.

```typescript
// BEFORE (line 579-592)
body: JSON.stringify({
  name: formData.name,
  cvBase64: formData.cvBase64,
  jobTypes: formData.jobTypes,
  languages: formData.languages,
  availFrom: formData.availFrom,
  availTo: formData.availTo,
  hasEUPassport: formData.hasEUPassport,
  accessToken: session.access_token,   // <-- remove this line
}),

// AFTER
body: JSON.stringify({
  name: formData.name,
  cvBase64: formData.cvBase64,
  jobTypes: formData.jobTypes,
  languages: formData.languages,
  availFrom: formData.availFrom,
  availTo: formData.availTo,
  hasEUPassport: formData.hasEUPassport,
}),
```

---

## Warnings

### WR-01: Non-Null Assertion on `response.body` With No Local Guard

**File:** `app/page.tsx:397`
**Issue:** `ProgressView` accesses `response.body!.getReader()` with a hard non-null assertion. The guard that checks `!response.body` exists in `FormView` (`line 593`), but `ProgressView` is a standalone component that accepts any `Response` prop. There is no check at the point of use. If `ProgressView` is ever rendered with a `Response` whose body is already consumed, is null (e.g., from a redirected response), or arrives from a future call site that omits the guard, this will throw an unhandled `TypeError` at runtime, crashing the entire view with no user-facing error message.

**Fix:** Add a null check inside `ProgressView` before accessing the reader:

```typescript
useEffect(() => {
  if (!response.body) {
    setLogLines([{ text: "Error: no se pudo leer la respuesta del servidor.", color: "red" }]);
    setSummary({ sent: 0, skipped: 0 });
    return;
  }
  let cancelled = false;
  const reader = response.body.getReader();
  // ... rest of existing logic
}, []);
```

### WR-02: `isSubmitting` Never Reset to `false` on the Success Path

**File:** `app/page.tsx:577, 596`
**Issue:** `setIsSubmitting(true)` is called at line 577. In the `catch` block (line 603), `setIsSubmitting(false)` is correctly called. On the success path (line 596), `onSubmitStart(response)` transitions the parent to `ProgressView`, causing `FormView` to unmount — so the stuck state is invisible in normal use. However, this is a latent bug: if the parent ever reuses the same `FormView` instance (React concurrent mode, StrictMode double-invocation) rather than unmounting it, the submit button will be permanently disabled with no error and no spinner after a successful submission. It also creates a misleading code pattern for future maintainers.

**Fix:** Add `setIsSubmitting(false)` before calling `onSubmitStart`:

```typescript
onSubmitStart(response);
setIsSubmitting(false);   // reset even though component will unmount
```

### WR-03: `onBlur` Validators Capture Stale `formData` via Closure

**File:** `app/page.tsx:635-638, 766-769, 795-798, 814-817`
**Issue:** Each `onBlur` handler calls `validate(formData)` where `formData` is the value captured at render time. Because React batches state updates, the `formData` seen by `onBlur` may lag one render behind the most recent `onChange` update. For the `name` field: the user types a character (triggering `onChange` → `setFormData`), then immediately blurs; `onBlur` fires synchronously but reads the previous render's `formData` value, so the validation runs against the pre-keystroke state. This means a user who types their name and immediately tabs away may briefly see a spurious "El nombre es obligatorio" error, only for it to clear on the next render.

**Fix:** Use a ref to hold the latest `formData`, or pass the current input value directly to a targeted validator rather than re-validating the whole form:

```typescript
// Example for name onBlur:
onBlur={(e) => {
  const trimmed = e.target.value.trim();
  setErrors((prev) => ({
    ...prev,
    name: trimmed ? undefined : "El nombre es obligatorio",
  }));
}}
```

### WR-04: SSE Parser Silently Drops Events When Proxy Injects Comment Lines

**File:** `app/page.tsx:406-414`
**Issue:** The SSE consumer splits on `\n\n`, then calls `part.trim()` before checking `line.startsWith("data: ")`. If a CDN or proxy injects SSE keepalive comment lines (`: keep-alive\n`) within an event block — a common pattern — the `trim()` will produce a string that starts with `:` rather than `data: `, and the event will be silently discarded. More specifically, a multi-field SSE event like:

```
: comment\ndata: {"type":"sent","employer":"Hotel X","email":"x@x.com"}\n\n
```

will have `part.trim()` return the comment line (the first line), failing the `startsWith("data: ")` guard and dropping the entire event.

**Fix:** Parse the SSE event block line-by-line, collecting only lines that start with `data: `, and assemble the data from those:

```typescript
for (const part of parts) {
  // Collect all data: lines within an SSE event block
  const dataLines = part
    .split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => l.slice(6));
  if (dataLines.length === 0) continue;
  const raw = dataLines.join("\n");
  let ev: SSEEvent;
  try {
    ev = JSON.parse(raw);
  } catch {
    continue;
  }
  // ... dispatch ev
}
```

### WR-05: Dynamic `<style>` Injection Breaks CSP and Causes Double-Animation in StrictMode

**File:** `app/page.tsx:169-184`
**Issue:** `FlyingBackground` constructs CSS `@keyframes` rules as a template string and injects them via a `<style>` tag (line 184). This pattern has two problems:

1. **CSP incompatibility**: A `Content-Security-Policy: style-src 'self'` header (without `'unsafe-inline'`) will block these inline styles, silently disabling all flying animations with no error surfaced to the user or developer.

2. **React StrictMode double-invocation**: In development, React 18 Strict Mode calls `useEffect` cleanup + re-run twice. The `useEffect` in `FlyingBackground` (line 140) has no cleanup, so on the second invocation `setConfig` fires again with a new set of `Math.random()` values, producing a new set of `@keyframes` names that differ from the first — but the first `<style>` element is still in the DOM (React doesn't remove the old `<style>` because it's tracked as a JSX child, not a side-effect artifact). This leaves duplicate conflicting `@keyframes` in the document.

**Fix (short-term):** Add a cleanup to the `useEffect` or ensure the effect only runs once. For CSP, prefer CSS custom properties or a CSS animation library that injects styles via a `<style>` element with a nonce, or use the Web Animations API.

---

## Info

### IN-01: Array Index Used as `key` for Growing Log List

**File:** `app/page.tsx:479`
**Issue:** `logLines.map((l, i) => <p key={i} ...>)` uses the array index as the React key. For a list that only grows by appending, this is functionally safe. However it is non-idiomatic and will produce incorrect reconciliation if any log line is ever removed or re-ordered, and React DevTools will report it as a pattern to avoid.

**Fix:** Generate a stable unique key when creating log lines, for example by including a monotonically increasing counter in the `LogLine` interface:

```typescript
interface LogLine {
  id: number;
  text: string;
  color: "blue" | "green" | "red" | "gray";
}
// In SSE consumer: { id: Date.now() + Math.random(), text: ..., color: ... }
// In JSX: key={l.id}
```

### IN-02: `session.access_token` Accessed Without TypeScript Type Augmentation at Call Site

**File:** `app/page.tsx:591`
**Issue:** `session.access_token` is read from a `Session` object whose base type from `next-auth` does not include `access_token`. The server-side file (`run/route.ts:32`) correctly casts the session. The client-side access at line 591 either relies on a global `next-auth.d.ts` augmentation (not visible in this file) or silently evaluates as `undefined`, sending `accessToken: undefined` in the body. If the type augmentation is missing, TypeScript will not catch this at compile time if `session` is typed as `any` transitively.

**Fix (separate from CR-01 which removes this field entirely):** If `session.access_token` is legitimately needed anywhere on the client, declare it in a type augmentation file:

```typescript
// types/next-auth.d.ts
import "next-auth";
declare module "next-auth" {
  interface Session {
    access_token?: string;
  }
}
```

---

_Reviewed: 2026-05-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
