---
phase: 01-auth-form
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - app/api/auth/[...nextauth]/route.ts
  - types/next-auth.d.ts
  - tailwind.config.ts
  - app/providers.tsx
  - app/page.tsx
  - app/layout.tsx
  - app/globals.css
  - vercel.json
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 1 delivers the NextAuth Google OAuth setup, the three-state UI (login / form / loading), and supporting configuration. The OAuth token plumbing and form logic are largely correct, but there are three blockers: the OAuth `access_token` is never refreshed, so long-lived sessions will silently fail when the Gmail send eventually happens; the access token is sent client-side inside the POST body where it can be logged by any proxy or Next.js middleware; and date validation allows `availFrom > availTo`, which will produce nonsensical cover-letter availability ranges downstream. Four warnings and three minor info items are also noted.

---

## Critical Issues

### CR-01: OAuth access_token never refreshed — will expire silently

**File:** `app/api/auth/[...nextauth]/route.ts:17-22`

**Issue:** The `jwt` callback stores `account.access_token` on first sign-in only (`if (account)`). Google OAuth access tokens expire in 3 600 s (1 hour). After expiry the token is stale in the JWT cookie. When Phase 2 calls the Gmail API with this token it will receive a 401, and the user has no way to recover without signing out and back in. The `account.refresh_token` is also never stored, so there is no path to refresh the token programmatically.

**Fix:**
```typescript
// route.ts — store refresh_token and expiry, use them to refresh
async jwt({ token, account }) {
  // First sign-in: persist refresh token and expiry
  if (account) {
    token.access_token  = account.access_token;
    token.refresh_token = account.refresh_token;
    token.expires_at    = account.expires_at; // seconds since epoch
  }

  // Token still valid — return as-is
  if (Date.now() < (token.expires_at as number) * 1000 - 60_000) {
    return token;
  }

  // Token expired — refresh
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    "refresh_token",
      refresh_token: token.refresh_token as string,
    }),
  });
  const tokens = await response.json();
  if (!response.ok) throw tokens; // forces re-login
  token.access_token = tokens.access_token;
  token.expires_at   = Math.floor(Date.now() / 1000) + tokens.expires_in;
  return token;
},
```

Also add `refresh_token` and `expires_at` to `types/next-auth.d.ts`:
```typescript
declare module "next-auth/jwt" {
  interface JWT {
    access_token?:  string;
    refresh_token?: string;
    expires_at?:    number;
  }
}
```

Google also requires `access_type: "offline"` and `prompt: "consent"` in the authorization params to guarantee a refresh token is issued:
```typescript
authorization: {
  params: {
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
  },
},
```

---

### CR-02: OAuth access_token transmitted in plain POST body to `/api/run`

**File:** `app/page.tsx:186`

**Issue:** `accessToken: session.access_token` is included in the JSON body of the POST to `/api/run`. This means:
- The token appears in Next.js server request logs and any CDN/proxy access logs.
- Any middleware that logs or inspects request bodies (common in observability setups) will capture a live OAuth bearer token.
- The token grants the right to send email on behalf of the user.

The access token is already stored in the encrypted NextAuth session cookie. The `/api/run` route handler can retrieve it server-side via `getServerSession()` without the client ever touching it.

**Fix:**
```typescript
// app/page.tsx — remove accessToken from body
body: JSON.stringify({
  name:      formData.name,
  cvBase64:  formData.cvBase64,
  jobTypes:  formData.jobTypes,
  languages: formData.languages,
  availFrom: formData.availFrom,
  availTo:   formData.availTo,
  // DO NOT send accessToken — retrieve it server-side
}),
```

```typescript
// app/api/run/route.ts (Phase 2) — retrieve token server-side
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.access_token) return new Response("Unauthorized", { status: 401 });
  // use session.access_token here
}
```

To enable `getServerSession`, export `authOptions` from the NextAuth route:
```typescript
// app/api/auth/[...nextauth]/route.ts
export const authOptions = { providers: [...], callbacks: {...} };
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

### CR-03: No date range validation — `availFrom` can be after `availTo`

**File:** `app/page.tsx:134-136`

**Issue:** The `validate` function only checks that both dates are non-empty. It does not verify that `availFrom <= availTo`. Submitting a reversed range (e.g., "available from December to November") will be sent to the pipeline and embedded verbatim into the Gemini-generated cover letter, producing a nonsensical or embarrassing application.

**Fix:**
```typescript
function validate(data: FormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.name.trim()) errs.name = "El nombre es obligatorio";
  if (!data.cv) errs.cv = "Solo se aceptan archivos PDF de hasta 5 MB";
  if (data.jobTypes.length === 0)
    errs.jobTypes = "Selecciona al menos un tipo de trabajo";
  if (!data.languages.trim()) errs.languages = "Indica al menos un idioma";
  if (!data.availFrom || !data.availTo) {
    errs.dates = "Indica las fechas de disponibilidad";
  } else if (data.availFrom > data.availTo) {
    errs.dates = "La fecha de inicio debe ser anterior a la fecha de fin";
  }
  return errs;
}
```

---

## Warnings

### WR-01: `fetch` to `/api/run` is fire-and-forget — errors silently swallowed

**File:** `app/page.tsx:176-199`

**Issue:** `fetch("/api/run", ...)` is called without `await`. The `.catch()` handler intentionally swallows errors with the comment "Phase 1: /api/run does not exist yet". The outer `try/catch` block (lines 193-199) can therefore never catch a network or server error from this fetch — the `catch` branch only covers synchronous throws before `onSubmitComplete()` is called.

When Phase 2 implements `/api/run`, this structure means any 4xx/5xx response or network failure will be silently ignored and the user will be stuck on the `LoadingView` forever with no way to recover or retry.

**Fix:** In Phase 2, add proper `await` and response status checking:
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const errs = validate(formData);
  setErrors(errs);
  if (Object.keys(errs).length > 0) return;

  setIsSubmitting(true);
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ... }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onSubmitComplete();
  } catch (err) {
    setErrors((e) => ({
      ...e,
      submit: "Error al iniciar el proceso. Intentalo de nuevo.",
    }));
    setIsSubmitting(false);
  }
}
```

---

### WR-02: `isSubmitting` never reset to `false` on the happy path — form permanently locked

**File:** `app/page.tsx:174, 193-199`

**Issue:** `setIsSubmitting(true)` is called at line 174. In the success path (no exception thrown), `isSubmitting` is never set back to `false` — `onSubmitComplete()` transitions the parent to `"loading"` view, but if the user navigates back or the view is reset (e.g., session expiry), `isSubmitting` remains `true` and the submit button is permanently disabled. In the error path `setIsSubmitting(false)` is correctly called (line 198), but as noted in WR-01, that branch is currently unreachable for fetch errors.

**Fix:** When Phase 2 adds the `await` (per WR-01), always reset in the `finally` block or before calling `onSubmitComplete`:
```typescript
  } catch (err) {
    setErrors(...);
  } finally {
    setIsSubmitting(false);
  }
```

---

### WR-03: `onBlur` validation uses stale closure — reports wrong errors

**File:** `app/page.tsx:235-238, 367-370, 404-406, 424-426`

**Issue:** Each `onBlur` handler calls `validate(formData)` where `formData` is the state value captured at render time. Because the `onChange` and `onBlur` fire in rapid succession (type a character, tab away), the React state update from `onChange` may not have been committed yet when `onBlur` runs. The blur validator therefore operates on the pre-keystroke `formData` value and may show a stale error (e.g., showing "required" even though the user just typed a valid value).

**Fix:** Use the functional updater pattern so validation reads the latest state:
```typescript
onBlur={() => {
  setFormData((current) => {
    const errs = validate(current);
    setErrors((e) => ({ ...e, name: errs.name }));
    return current; // no change to formData
  });
}}
```

---

### WR-04: `cvBase64` can be `null` when form is submitted — pipeline receives `null`

**File:** `app/page.tsx:149-153, 179`

**Issue:** `handleFile` reads the file asynchronously with `FileReader`. If the user somehow triggers form submission before `reader.onload` fires (unlikely but possible with a very large file nearing the 5 MB limit and a slow device), `formData.cvBase64` will still be `null` at submission time even though `formData.cv` is set. The `validate` function only checks `data.cv` (the `File` object), not `data.cvBase64`. The pipeline would then receive `cvBase64: null`.

**Fix:** Add a `cvBase64` check in `validate`:
```typescript
if (!data.cv || !data.cvBase64)
  errs.cv = "Solo se aceptan archivos PDF de hasta 5 MB";
```

---

## Info

### IN-01: `mx-4` utility duplicated alongside `max-w-lg mx-auto` — layout bug on mobile

**File:** `app/page.tsx:204`

**Issue:** The form card uses `max-w-lg mx-auto bg-white ... mx-4`. Tailwind processes classes left to right; `mx-4` (the second margin-x class) overrides `mx-auto`. On screens wider than 512 px the card is no longer centered — it is pushed 16 px from the left edge. This is a straightforward CSS specificity/ordering bug.

**Fix:**
```tsx
<div className="max-w-lg mx-auto bg-white shadow-md rounded-2xl p-8 px-4">
```
Use `px-4` for horizontal padding on the wrapper, or wrap the card in a padding container:
```tsx
<div className="px-4">
  <div className="max-w-lg mx-auto bg-white shadow-md rounded-2xl p-8">
```

---

### IN-02: Missing `NEXTAUTH_SECRET` — will crash in production with no useful error

**File:** `app/api/auth/[...nextauth]/route.ts:4`

**Issue:** `NEXTAUTH_SECRET` is not validated at startup. NextAuth v4 silently generates a random secret in development but throws a hard error in production (`NODE_ENV=production`) with the message "Please define a `NEXTAUTH_SECRET`". The `.env.example` file includes it (per CLAUDE.md) but it is not checked at initialization. A missing env var in a Vercel deployment will surface as a 500 at the first auth callback — after users have already attempted to sign in.

**Fix:** Add a startup guard:
```typescript
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET environment variable is required");
}
```

---

### IN-03: Accented characters missing from UI strings

**File:** `app/page.tsx:80, 212`

**Issue:** Two user-visible strings are missing Spanish accent marks: `"Iniciar sesion con Google"` (line 80) should be `"Iniciar sesión con Google"`, and `"Cerrar sesion"` (line 212) should be `"Cerrar sesión"`. These are visible to end users and reflect on the product quality.

**Fix:**
```tsx
<span>Iniciar sesión con Google</span>
// ...
Cerrar sesión
```

---

_Reviewed: 2026-05-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
