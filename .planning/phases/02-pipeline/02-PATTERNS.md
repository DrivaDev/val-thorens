# Phase 2: Pipeline - Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 8 nuevos archivos a crear + 1 a modificar
**Analogs found:** 5 / 9 (los 4 lib/* sin email/scraping son nuevos patrones sin analog directo)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/places.ts` | service | request-response | `app/api/auth/[...nextauth]/route.ts` (fetch + env vars) | partial |
| `lib/scraper.ts` | service | file-I/O | ninguno — primer uso de Puppeteer | no analog |
| `lib/gemini.ts` | service | request-response | `app/api/auth/[...nextauth]/route.ts` (env vars + provider call) | partial |
| `lib/gmail.ts` | service | request-response | `app/page.tsx` líneas 436-449 (fetch POST con Authorization) | partial |
| `lib/sheets.ts` | service | request-response | `app/api/auth/[...nextauth]/route.ts` (Google credentials pattern) | partial |
| `app/api/run/route.ts` | controller | streaming (SSE) | `app/api/auth/[...nextauth]/route.ts` (route handler export) | role-match |
| `app/api/search/route.ts` | controller | request-response | `app/api/auth/[...nextauth]/route.ts` | role-match |
| `app/api/scrape/route.ts` | controller | request-response | `app/api/auth/[...nextauth]/route.ts` | role-match |
| `next.config.mjs` | config | — | `next.config.mjs` actual (modificación) | exact |

---

## Pattern Assignments

### `app/api/run/route.ts` (controller, streaming SSE)

**Analog:** `app/api/auth/[...nextauth]/route.ts` — mismo patrón de export de route handler

**Imports pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` líneas 1-2, adaptar:
```typescript
import { getServerSession } from "next-auth";
import { discoverEmployers } from "@/lib/places";
import { scrapeEmail } from "@/lib/scraper";
import { generateEmailBody } from "@/lib/gemini";
import { sendEmail } from "@/lib/gmail";
import { logToSheets } from "@/lib/sheets";
```

**Export pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` línea 30, adaptar a POST:
```typescript
// El analog usa: export { handler as GET, handler as POST }
// Este archivo exporta solo POST:
export async function POST(request: Request) { ... }
```

**Auth guard pattern** — verificar sesión antes de ejecutar el pipeline (security domain ASVS V4):
```typescript
// Verificar sesión al inicio — NUNCA ejecutar el pipeline sin autenticación
const session = await getServerSession();
if (!session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

**Core SSE pattern** — ReadableStream con encoder (RESEARCH.md Pattern 1, líneas 199-240):
```typescript
const encoder = new TextEncoder();

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const body = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sseEvent({ type: 'searching', message: 'Buscando empleadores...' }));
        const employers = await discoverEmployers();
        controller.enqueue(sseEvent({ type: 'discovery_complete', total: employers.length }));

        for (const employer of employers) {
          try {
            // pipeline por employer: scrape → generate → send → log
          } catch (err) {
            controller.enqueue(sseEvent({ type: 'error', employer: employer.name, error: String(err) }));
            // NO re-throw — continuar con el siguiente
          }
        }

        controller.enqueue(sseEvent({ type: 'complete' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Input validation** — validar body antes del pipeline (RESEARCH.md Security Domain V5):
```typescript
const { name, cvBase64, jobTypes, languages, availFrom, availTo, accessToken } = body;
if (!name || !cvBase64 || !accessToken) {
  return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
}
```

**Sleep helper** — patrón común para rate limits (usar en run/route.ts y en los lib/*):
```typescript
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

### `lib/places.ts` (service, request-response)

**Analog:** `app/api/auth/[...nextauth]/route.ts` líneas 8-10 — mismo patrón de uso de `process.env.VAR!`

**Imports pattern** — sin imports de terceros; solo fetch nativo:
```typescript
// No imports necesarios — fetch es nativo en Node 18+
// Solo exportar la interfaz y la función principal
```

**Env vars pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` líneas 7-8:
```typescript
// El analog usa: process.env.GOOGLE_CLIENT_ID!
// Aquí igual:
process.env.GOOGLE_MAPS_API_KEY!
```

**Core pattern** — Places API Text Search con paginación (RESEARCH.md Pattern 3, líneas 342-412):
```typescript
const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.websiteUri,places.id';

export interface Employer {
  placeId: string;
  name: string;
  address: string;
  website: string | null;
}

export async function discoverEmployers(): Promise<Employer[]> {
  const allEmployers = new Map<string, Employer>(); // dedup por placeId con Set

  for (const query of VAL_THORENS_QUERIES) {
    let pageToken: string | undefined;
    let page = 0;

    do {
      if (page > 0) await sleep(1000); // rate limit: 1 req/s entre páginas

      const body: Record<string, unknown> = { textQuery: query, pageSize: 20 };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch(PLACES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
          'X-Goog-FieldMask': FIELD_MASK + ',nextPageToken',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      for (const place of data.places ?? []) { ... }
      pageToken = data.nextPageToken;
      page++;
    } while (pageToken && page < 3); // máx 3 páginas = 60 resultados/query
  }

  return Array.from(allEmployers.values());
}
```

**Error handling pattern** — los errores individuales de query se loguean y continúan (CLAUDE.md constraint):
```typescript
// Dentro del for (const query of VAL_THORENS_QUERIES):
try {
  // ... fetch y paginación
} catch (err) {
  console.error(`[places] Error en query "${query}":`, err);
  // continuar con siguiente query — nunca abortar el discovery completo
}
```

---

### `lib/scraper.ts` (service, file-I/O)

**Analog:** Ninguno en el codebase — primer archivo con Puppeteer. Usar RESEARCH.md Pattern 2 directamente.

**Imports pattern** — paquetes a instalar (RESEARCH.md Standard Stack):
```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
```

**Core pattern** — lanzamiento de Chromium serverless con try/finally OBLIGATORIO (RESEARCH.md Pattern 2, líneas 252-323):
```typescript
export async function scrapeEmail(url: string): Promise<string | null> {
  chromium.setGraphicsMode = false; // CRÍTICO para serverless

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const emails = await extractEmails(page);
    if (emails.length > 0) return prioritizeEmail(emails);

    // Fallback: /contact y /recrutement
    for (const path of ['/contact', '/recrutement']) {
      try {
        await page.goto(new URL(path, url).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const more = await extractEmails(page);
        if (more.length > 0) return prioritizeEmail(more);
      } catch { /* continuar */ }
    }

    return null;
  } finally {
    await browser.close(); // SIEMPRE — evitar zombie processes en serverless
  }
}
```

**Email extraction pattern** — mailto: links + regex (RESEARCH.md Pattern 2, líneas 294-322):
```typescript
async function extractEmails(page: any): Promise<string[]> {
  return page.evaluate(() => {
    const emails: string[] = [];
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const email = (a as HTMLAnchorElement).href.replace('mailto:', '').split('?')[0].trim();
      if (email) emails.push(email);
    });
    const text = document.body.innerText;
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return [...new Set([...emails, ...matches])];
  });
}

const EMAIL_PRIORITY = ['contact', 'rh', 'info', 'jobs', 'recrutement', 'emploi', 'saison'];

function prioritizeEmail(emails: string[]): string {
  // ordenar por prefijo según EMAIL_PRIORITY
  const sorted = emails.sort((a, b) => {
    const prefix = (e: string) => e.split('@')[0].toLowerCase();
    const ai = EMAIL_PRIORITY.findIndex((p) => prefix(a).includes(p));
    const bi = EMAIL_PRIORITY.findIndex((p) => prefix(b).includes(p));
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return sorted[0];
}
```

---

### `lib/gemini.ts` (service, request-response)

**Analog:** `app/api/auth/[...nextauth]/route.ts` líneas 5-8 — mismo patrón de instanciación de provider con API key desde env.

**Imports pattern**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
```

**Provider instantiation pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` líneas 5-8:
```typescript
// El analog instancia GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID! })
// Aquí igual:
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
```

**Core pattern** — generateContent + retry exponencial para 429 (RESEARCH.md Pattern 4, líneas 425-488):
```typescript
export async function generateEmailBody(
  candidate: CandidateData,
  employer: { name: string; type?: string }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  // Nota: gemini-2.0-flash deprecated — se puede cambiar a 'gemini-2.5-flash'
  // en una sola línea si el planner lo decide

  const prompt = `...`; // ver RESEARCH.md Pattern 4 para el prompt completo en francés

  return await callWithRetry(() => model.generateContent(prompt));
}

async function callWithRetry(fn: () => Promise<any>, maxAttempts = 3): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result.response.text();
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.message?.includes('429');
      if (is429 && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### `lib/gmail.ts` (service, request-response)

**Analog:** `app/page.tsx` líneas 436-449 — mismo patrón de `fetch` POST con `Authorization: Bearer` y body JSON.

**Fetch con Authorization pattern** — copiar de `app/page.tsx` líneas 436-449:
```typescript
// El analog (page.tsx) hace:
fetch("/api/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...data, accessToken: session.access_token }),
})

// En gmail.ts el patrón análogo es:
const response = await fetch(
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`, // <-- mismo token que usa el frontend
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  }
);
```

**Core MIME pattern** — construcción manual sin librerías (RESEARCH.md Pattern 5, líneas 500-556):
```typescript
export async function sendEmail(params: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  cvBase64: string;
  cvFilename: string;
  fromEmail: string;
}): Promise<void> {
  const boundary = `boundary_${Date.now()}`;

  const mimeMessage = [
    `From: ${params.fromEmail}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    params.body,
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    `Content-Disposition: attachment; filename="${params.cvFilename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    params.cvBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  // CRÍTICO: base64url — 3 reemplazos obligatorios (RESEARCH.md Pitfall 3)
  const encoded = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // ... fetch a Gmail API
}
```

**Error handling pattern**:
```typescript
if (!response.ok) {
  const error = await response.text();
  throw new Error(`Gmail send failed: ${response.status} — ${error}`);
}
// El caller (run/route.ts) captura este throw y emite SSE event 'send_error'
// sin abortar el pipeline
```

---

### `lib/sheets.ts` (service, request-response)

**Analog:** `app/api/auth/[...nextauth]/route.ts` líneas 5-28 — mismo patrón de credenciales Google desde env var + callback de sesión.

**Imports pattern**:
```typescript
import { google } from 'googleapis';
```

**Google credentials pattern** — análogo a cómo NextAuth usa las credenciales de Google (RESEARCH.md Pattern 6):
```typescript
// El analog (nextauth/route.ts) usa:
// process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!

// En sheets.ts el patrón es:
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
```

**Core pattern** — append de fila (RESEARCH.md Pattern 6, líneas 563-592):
```typescript
const SHEET_ID = '1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek';

export async function logToSheets(userName: string, employerName: string): Promise<void> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[userName, employerName, 'No']],
    },
  });
}
```

**Error handling graceful** — sheets es opcional (RESEARCH.md Environment Availability):
```typescript
// En run/route.ts al llamar logToSheets:
try {
  await logToSheets(name, employer.name);
  controller.enqueue(sseEvent({ type: 'logged', employer: employer.name }));
} catch (err) {
  console.error('[sheets] Log failed (non-blocking):', err);
  // No emitir evento de error al cliente — el email ya fue enviado
}
```

---

### `app/api/search/route.ts` (controller, request-response)

**Analog:** `app/api/auth/[...nextauth]/route.ts` — mismo esquema de route handler en App Router.

**Export pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` línea 30:
```typescript
// El analog: export { handler as GET, handler as POST }
// Aquí solo GET (proxy de Places):
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  // ... proxear a Places API con API key privada
}
```

**Nota:** Este endpoint es opcional según RESEARCH.md. Si el planner lo omite y llama directamente a `lib/places.ts` desde `run/route.ts`, es igualmente válido.

---

### `app/api/scrape/route.ts` (controller, request-response)

**Analog:** `app/api/auth/[...nextauth]/route.ts` — mismo esquema de route handler.

**Export pattern** — copiar de `app/api/auth/[...nextauth]/route.ts` línea 30:
```typescript
export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
  }
  try {
    const email = await scrapeEmail(url);
    return new Response(JSON.stringify({ email }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
```

**vercel.json** — ya configurado con `maxDuration: 60` para este endpoint (archivo actual líneas 6-8).

---

### `next.config.mjs` (config — modificación)

**Analog:** `next.config.mjs` actual (líneas 1-4) — modificación directa del archivo existente.

**Archivo actual** (`next.config.mjs` líneas 1-4):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

**Modificación requerida** — añadir `serverComponentsExternalPackages` (RESEARCH.md Pitfall 4):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
};

export default nextConfig;
```

**Por qué es crítico:** Sin esta config, el bundler de Next.js intenta procesar los binarios `.br` de Chromium y falla en build. (RESEARCH.md Pitfall 4, líneas 651-664)

---

## Shared Patterns

### Env vars con non-null assertion
**Source:** `app/api/auth/[...nextauth]/route.ts` líneas 7-8
**Apply to:** `lib/places.ts`, `lib/gemini.ts`, `lib/sheets.ts`
```typescript
// Patrón del proyecto: siempre usar ! en env vars requeridas
process.env.GOOGLE_CLIENT_ID!       // analog
process.env.GOOGLE_MAPS_API_KEY!    // places.ts
process.env.GOOGLE_GEMINI_API_KEY!  // gemini.ts
process.env.GOOGLE_SERVICE_ACCOUNT_JSON! // sheets.ts
```

### Access token flow
**Source:** `app/api/auth/[...nextauth]/route.ts` líneas 17-27 + `types/next-auth.d.ts` líneas 3-6
**Apply to:** `app/api/run/route.ts`, `lib/gmail.ts`
```typescript
// El token ya está en session.access_token (implementado en Fase 1)
// types/next-auth.d.ts declara: session.access_token?: string
// route.ts callback persiste: session.access_token = token.access_token as string
// En run/route.ts: leer del body del POST (el frontend ya lo envía — page.tsx línea 447)
const { accessToken } = await request.json();
// Pasar a gmail.ts: await sendEmail({ accessToken, ... })
```

### Error handling: log y continúa
**Source:** Patrón del CLAUDE.md + implementado en `app/page.tsx` línea 449 (`.catch(() => {})`)
**Apply to:** `app/api/run/route.ts` — loop principal del pipeline
```typescript
// El frontend ya usa este patrón (page.tsx línea 449):
fetch("/api/run", { ... }).catch(() => {});

// En run/route.ts, mismo principio por employer:
for (const employer of employers) {
  try {
    // ... pipeline completo
  } catch (err) {
    controller.enqueue(sseEvent({ type: 'error', employer: employer.name, error: String(err) }));
    // NO re-throw — continuar con siguiente employer
  }
}
```

### Route handler export (Next.js App Router)
**Source:** `app/api/auth/[...nextauth]/route.ts` línea 30
**Apply to:** `app/api/run/route.ts`, `app/api/search/route.ts`, `app/api/scrape/route.ts`
```typescript
// Patrón del proyecto: named exports por método HTTP
export { handler as GET, handler as POST }  // analog (nextauth)
export async function POST(request: Request) { ... }  // nuevos endpoints
```

### Sleep helper (rate limits)
**Source:** RESEARCH.md — patrón transversal a múltiples lib/*
**Apply to:** `lib/places.ts` (1000ms entre páginas), `app/api/run/route.ts` (4000ms entre sends)
```typescript
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Definir una vez en cada archivo que lo necesite (no crear lib/utils.ts por una sola función)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/scraper.ts` | service | file-I/O | Primer uso de Puppeteer en el proyecto — usar RESEARCH.md Pattern 2 directamente |
| `app/api/run/route.ts` (SSE) | controller | streaming | El proyecto no tiene ningún endpoint SSE existente — usar RESEARCH.md Pattern 1 directamente |

---

## Critical Implementation Notes for Planner

1. **`next.config.mjs` debe modificarse ANTES de instalar los paquetes de Puppeteer** — si el dev server está corriendo, reiniciarlo después del cambio.

2. **Orden de instalación de paquetes:**
   ```bash
   npm install @sparticuz/chromium@149.0.0 puppeteer-core@25.1.0 @google/generative-ai googleapis
   ```

3. **`browser.close()` en try/finally es obligatorio** — ver RESEARCH.md Pitfall 1. El planner debe marcar esto como requisito de code review.

4. **base64url vs base64 en Gmail** — los 3 reemplazos (`.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')`) son obligatorios — ver RESEARCH.md Pitfall 3.

5. **`gemini-2.0-flash` vs `gemini-2.5-flash`** — CLAUDE.md especifica `gemini-2.0-flash` pero está deprecated. El planner puede decidir usar `gemini-2.5-flash` — es un cambio de 1 string en `lib/gemini.ts`.

6. **SSE event types** — los tipos de evento que el frontend (Fase 3) esperará del stream:
   - `searching` → `{ type, query, found }`
   - `discovery_complete` → `{ type, total }`
   - `scraping` → `{ type, employer, email | null }`
   - `generating` → `{ type, employer }`
   - `sent` → `{ type, employer, email }`
   - `send_error` → `{ type, employer, error }`
   - `logged` → `{ type, employer }`
   - `complete` → `{ type, sent, skipped }`

---

## Metadata

**Analog search scope:** `app/`, `lib/`, `types/`, `next.config.mjs`, `vercel.json`
**Files scanned:** 5 archivos fuente (route.ts, page.tsx, layout.tsx, providers.tsx, next-auth.d.ts) + 2 config (next.config.mjs, vercel.json)
**Pattern extraction date:** 2026-05-31
