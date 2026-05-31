# Phase 2: Pipeline - Research

**Researched:** 2026-05-31
**Domain:** Automatización de candidaturas — Google Places, Puppeteer serverless, Gemini AI, Gmail API, Google Sheets API, SSE
**Confidence:** HIGH (stack y patrones verificados con docs oficiales y npm registry)

---

## Summary

Esta fase implementa el núcleo del producto: un pipeline de 4 etapas que corre en el servidor — descubrimiento de empleadores (Places API), scraping de emails (Puppeteer), generación de emails personalizados (Gemini), y envío + logging (Gmail API + Sheets API). Todo orquestado desde `app/api/run/route.ts` como un POST que devuelve SSE via `ReadableStream`.

La Fase 1 ya estableció las bases críticas: NextAuth expone el `access_token` del usuario en la sesión, el formulario envía `cvBase64` + `accessToken` al endpoint `/api/run`, y la transición al estado "loading" está implementada en `app/page.tsx`. Esta fase construye exclusivamente el servidor — sin cambios en el frontend (eso es Fase 3).

**Recomendación principal:** Implementar el pipeline como un generador asíncrono (`async function*`) que hace `yield` de eventos SSE formateados, envuelto en un `ReadableStream` y retornado como `Response`. Cada etapa opera sobre el resultado de la anterior. Los errores individuales se loguean y se continúa — nunca se aborta el pipeline.

---

<phase_requirements>
## Phase Requirements

| ID | Descripción | Soporte de investigación |
|----|-------------|--------------------------|
| DISC-01 | Consultar Places API (Text Search) con 7 queries predefinidas para Val Thorens | Patrón REST verificado, endpoint y field mask documentados |
| DISC-02 | Recolectar name, address, website, place_id por resultado | Field mask confirmada: `places.displayName,places.formattedAddress,places.websiteUri,places.id` |
| DISC-03 | Paginar hasta 60 resultados por query con next_page_token | Confirmado: Places API (New) soporta nextPageToken, máximo 60 resultados |
| DISC-04 | Deduplicar por place_id | Implementación simple con `Set<string>` |
| DISC-05 | Rate limit Places API a 1 req/s entre páginas | `await sleep(1000)` entre calls de paginación |
| SCRP-01 | Abrir cada website con Puppeteer headless (sparticuz/chromium) | `@sparticuz/chromium@149` + `puppeteer-core@25.x` — compatibles y verificados |
| SCRP-02 | Extraer emails de mailto: links y regex | Patrón regex documentado en sección de ejemplos |
| SCRP-03 | Priorizar emails con prefijos: contact, rh, info, jobs, recrutement, emploi, saison | Ordenamiento por lista de prioridad |
| SCRP-04 | Si no hay email en homepage, intentar /contact y /recrutement | Lógica de fallback con paths adicionales |
| SCRP-05 | Empleadores sin email se marcan como skipped | `status: 'skipped'` en el objeto resultado |
| GEN-01 | Llamar Gemini 2.0 Flash para generar email personalizado en francés | SDK `@google/generative-ai@0.24.x`, modelo `gemini-2.0-flash` |
| GEN-02 | Email incluye: intro, interés en establecimiento, disponibilidad, idiomas, nota CV adjunto, cierre | Prompt estructurado documentado en ejemplos |
| GEN-03 | Asunto hardcodeado: `Candidature - Saison d'hiver {year} - {nombre}` | Implementación directa |
| GEN-04 | Gemini 429 → retry exponencial | Patrón: esperar `2^attempt * 1000ms`, máximo 3 intentos |
| SEND-01 | Construir mensaje MIME RFC 2822 con body texto y adjunto PDF | Patrón MIME sin librerías externas documentado en ejemplos |
| SEND-02 | Enviar via Gmail API con access_token OAuth del usuario | `POST /gmail/v1/users/me/messages/send` con `Authorization: Bearer` |
| SEND-03 | Esperar 4 segundos entre cada envío | `await sleep(4000)` entre sends |
| SEND-04 | Fallos individuales de envío se loguean y el pipeline continúa | try/catch + yield de evento error + continue |
| SHTS-01 | Append de fila a Google Sheet ID `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek` | `googleapis` v173, `spreadsheets.values.append` |
| SHTS-02 | Columnas: A=nombre usuario, B=nombre empleador, C="No" | `values: [[userName, employerName, "No"]]` |
| SHTS-03 | Autenticar Sheets API via Service Account JSON (env var) | `google.auth.GoogleAuth` con `credentials` desde JSON.parse(env) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **Puppeteer:** DEBE usar `@sparticuz/chromium` + `puppeteer-core`. Nunca el paquete `puppeteer` completo (incompatible con Vercel).
- **SSE:** Usar `ReadableStream` en Next.js App Router. No WebSockets.
- **CV storage:** Base64 en memoria solo durante el pipeline. Nunca persistir a disco.
- **NextAuth session:** El `access_token` ya está expuesto en `session.access_token` (implementado en Fase 1).
- **Rate limits:** Places 1 req/s entre páginas; Gmail 4s entre envíos; Gemini 429 → retry exponencial.
- **Error handling:** Log y continuar en fallos individuales. Nunca abortar el pipeline.
- **Gmail scope:** `gmail.send` only. Nunca pedir lectura de inbox.
- **Vercel maxDuration:** 300s para `run/route.ts`, 60s para `scrape/route.ts` (ya configurado en `vercel.json`).
- **Google Sheet ID hardcodeado:** `1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek`

---

## Architectural Responsibility Map

| Capability | Tier primario | Tier secundario | Racional |
|------------|--------------|-----------------|----------|
| Orquestación del pipeline | API / Backend (`run/route.ts`) | — | Toda la lógica es server-side; el cliente solo lee el stream |
| Descubrimiento de empleadores | API / Backend (`lib/places.ts`) | — | Requiere API key privada; nunca exponer al cliente |
| Scraping de emails | API / Backend (`lib/scraper.ts` + `scrape/route.ts`) | — | Puppeteer solo corre en Node.js server-side |
| Generación de emails | API / Backend (`lib/gemini.ts`) | — | Requiere API key de Gemini; procesamiento en servidor |
| Envío de emails | API / Backend (`lib/gmail.ts`) | — | Usa access_token del usuario; lógica en servidor |
| Logging en Sheets | API / Backend (`lib/sheets.ts`) | — | Service account credentials solo en servidor |
| SSE stream al frontend | API / Backend (`run/route.ts`) | Browser (consume EventSource) | El servidor produce; el cliente consume |
| CV en Base64 | En memoria durante request | — | Nunca a disco; viaja en el body del POST |

---

## Standard Stack

### Core (paquetes a instalar)

| Librería | Versión verificada | Propósito | Por qué es estándar |
|----------|-------------------|-----------|---------------------|
| `@sparticuz/chromium` | `149.0.0` | Chromium binary para serverless | Única opción compatible con Vercel/Lambda — no bundle el binario |
| `puppeteer-core` | `25.1.0` | Control de Chromium | Versión ligera sin Chromium bundleado; Chrome 149 compatible [VERIFIED: npm registry] |
| `@google/generative-ai` | `0.24.1` | SDK para Gemini | SDK oficial Google para Gemini 2.0 Flash [VERIFIED: npm registry] |
| `googleapis` | `173.0.0` | Gmail API + Sheets API | Cliente oficial Google APIs Node.js [VERIFIED: npm registry] |
| `google-auth-library` | `10.6.2` | Auth para Service Account | Dependencia de googleapis, ya disponible transitivamente [VERIFIED: npm registry] |

### Ya instalados (Fase 1)

| Librería | Versión | Notas |
|----------|---------|-------|
| `next` | `^14.2.35` | App Router — ReadableStream nativo para SSE |
| `next-auth` | `^4.24.14` | access_token ya expuesto en sesión |

### Alternativas consideradas

| En lugar de | Podría usarse | Tradeoff |
|-------------|---------------|----------|
| `@google/generative-ai` | `@google-cloud/vertexai` | Vertex requiere GCP project y billing — el SDK genai es más simple para free tier |
| Construcción manual de MIME | `nodemailer` | nodemailer simplifica MIME pero añade dependencia; el raw MIME es ~30 líneas de código y evita bloat |
| Places API (New) REST directo | `@googlemaps/google-maps-services-js` | El cliente Node.js de Maps no soporta bien Places API (New) — usar fetch directo es más claro |

**Instalación:**
```bash
npm install @sparticuz/chromium@149.0.0 puppeteer-core@25.1.0 @google/generative-ai googleapis
```

**Verificación de versiones:**
```bash
npm view @sparticuz/chromium version   # 149.0.0
npm view puppeteer-core version        # 25.1.0
npm view @google/generative-ai version # 0.24.1
npm view googleapis version            # 173.0.0
```

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/run
  │  body: { name, cvBase64, jobTypes, languages, availFrom, availTo, accessToken }
  │
  ▼
run/route.ts (ReadableStream SSE, maxDuration=300s)
  │
  ├─► [DISCOVER] lib/places.ts
  │     └─ 7 queries × Places API Text Search (New)
  │         ├─ page 1 → nextPageToken → page 2 → page 3 (max 60/query)
  │         ├─ sleep(1000ms) entre páginas
  │         └─ dedup por place_id → lista de Employer[]
  │   SSE event: { type: 'searching', query, found }
  │   SSE event: { type: 'discovery_complete', total }
  │
  ├─► [SCRAPE] lib/scraper.ts  (para cada employer con website)
  │     └─ puppeteer-core + @sparticuz/chromium
  │         ├─ browser.newPage() → page.goto(website)
  │         ├─ extraer mailto: links + regex emails
  │         ├─ si vacío: intentar /contact, /recrutement
  │         └─ cerrar browser por employer (no reusar en serverless)
  │   SSE event: { type: 'scraping', employer, email | null }
  │
  ├─► [GENERATE] lib/gemini.ts  (para cada employer con email)
  │     └─ GoogleGenerativeAI → generateContent
  │         ├─ prompt con datos del candidato + tipo de negocio
  │         ├─ on 429: retry exponencial (max 3 intentos)
  │         └─ devuelve texto del email en francés
  │   SSE event: { type: 'generating', employer }
  │
  ├─► [SEND + LOG] lib/gmail.ts + lib/sheets.ts  (por employer)
  │     ├─ construir MIME multipart (text + PDF adjunto)
  │     ├─ POST gmail.googleapis.com/v1/users/me/messages/send
  │     ├─ sleep(4000ms) después de cada send
  │     └─ si send OK: sheets.spreadsheets.values.append(...)
  │   SSE event: { type: 'sent', employer, email }
  │   SSE event: { type: 'send_error', employer, error }
  │   SSE event: { type: 'logged', employer }
  │
  └─► SSE event: { type: 'complete', sent, skipped }
```

### Estructura de archivos objetivo

```
app/
  api/
    auth/[...nextauth]/route.ts   # YA EXISTE - no tocar
    run/route.ts                  # Orquestador SSE (Pipeline)
    search/route.ts               # Proxy Places API (opcional, ver nota)
    scrape/route.ts               # Endpoint Puppeteer (si se separa)
lib/
  places.ts                       # Discovery (Places API)
  scraper.ts                      # Email scraping (Puppeteer)
  gemini.ts                       # Email generation (Gemini)
  gmail.ts                        # Email sending (Gmail API)
  sheets.ts                       # Logging (Sheets API)
types/
  next-auth.d.ts                  # YA EXISTE - types de sesión
```

**Nota sobre search/route.ts y scrape/route.ts:** El CLAUDE.md los lista como rutas separadas. Dado el maxDuration de 60s para scrape, es válido extraer el scraping a su propio endpoint. Sin embargo, dado que el pipeline ya tiene maxDuration=300s en run/route.ts y el scraping de un solo sitio raramente supera 10s, puede orquestarse todo desde `run/route.ts`. La implementación con rutas separadas es más segura para Vercel (cada función tiene su propio timeout).

---

## Pattern 1: SSE con ReadableStream en Next.js App Router

**Qué es:** El endpoint `/api/run` retorna un `Response` con un `ReadableStream`. El cliente lee eventos SSE con formato `data: {json}\n\n`.

**Cuándo usar:** Siempre que se necesite streaming de larga duración sin WebSockets en App Router.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (streaming docs, verificado 2026-05-31)
// app/api/run/route.ts

const encoder = new TextEncoder();

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const body = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Etapa 1: Discovery
        controller.enqueue(sseEvent({ type: 'searching', message: 'Buscando empleadores...' }));
        const employers = await discoverEmployers();
        controller.enqueue(sseEvent({ type: 'discovery_complete', total: employers.length }));

        // Etapa 2-4: Scrape, Generate, Send por employer
        for (const employer of employers) {
          try {
            // ... pipeline por employer
          } catch (err) {
            controller.enqueue(sseEvent({ type: 'error', employer: employer.name, error: String(err) }));
            // continuar — no re-throw
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

---

## Pattern 2: @sparticuz/chromium + puppeteer-core en Vercel

**Qué es:** Puppeteer en entorno serverless requiere un binario de Chromium especial, sin GPU/gráficos, con flags específicos.

**Compatibilidad verificada:** `@sparticuz/chromium@149.0.0` es compatible con `puppeteer-core@25.1.0` (ambos apuntan a Chromium 149). [VERIFIED: npm registry + WebSearch]

```typescript
// Source: https://github.com/Sparticuz/chromium (README, verificado via WebFetch 2026-05-31)
// lib/scraper.ts

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function scrapeEmail(url: string): Promise<string | null> {
  // CRÍTICO: deshabilitar graphics para serverless
  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const emails = await extractEmails(page);
    if (emails.length > 0) return prioritizeEmail(emails);

    // Fallback: intentar /contact y /recrutement
    for (const path of ['/contact', '/recrutement']) {
      try {
        await page.goto(new URL(path, url).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const more = await extractEmails(page);
        if (more.length > 0) return prioritizeEmail(more);
      } catch { /* continuar */ }
    }

    return null;
  } finally {
    await browser.close(); // SIEMPRE cerrar el browser
  }
}

async function extractEmails(page: any): Promise<string[]> {
  return page.evaluate(() => {
    const emails: string[] = [];
    // mailto: links
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const email = (a as HTMLAnchorElement).href.replace('mailto:', '').split('?')[0].trim();
      if (email) emails.push(email);
    });
    // regex en texto de la página
    const text = document.body.innerText;
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return [...new Set([...emails, ...matches])];
  });
}

const EMAIL_PRIORITY = ['contact', 'rh', 'info', 'jobs', 'recrutement', 'emploi', 'saison'];

function prioritizeEmail(emails: string[]): string {
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

**CRÍTICO para Vercel:** Añadir a `next.config.mjs`:
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
};
```
Sin esto, el bundler de Next.js intentará procesar los binarios de Chromium y fallará. [ASSUMED — patrón común en proyectos Next.js + puppeteer serverless]

---

## Pattern 3: Google Places API (New) — Text Search con paginación

**Qué es:** REST directo a `places.googleapis.com/v1/places:searchText` con field mask y paginación via `nextPageToken`.

```typescript
// Source: https://developers.google.com/maps/documentation/places/web-service/text-search (verificado 2026-05-31)
// lib/places.ts

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.websiteUri,places.id';

export interface Employer {
  placeId: string;
  name: string;
  address: string;
  website: string | null;
}

// Las 7 queries predefinidas para Val Thorens
const VAL_THORENS_QUERIES = [
  'hotels Val Thorens',
  'restaurants Val Thorens',
  'bars Val Thorens',
  'ski schools Val Thorens',
  'shops Val Thorens',
  'nightclubs Val Thorens',
  'chalets Val Thorens',
];

export async function discoverEmployers(): Promise<Employer[]> {
  const allEmployers = new Map<string, Employer>(); // dedup por placeId

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

      for (const place of data.places ?? []) {
        const employer: Employer = {
          placeId: place.id,
          name: place.displayName?.text ?? 'Unknown',
          address: place.formattedAddress ?? '',
          website: place.websiteUri ?? null,
        };
        allEmployers.set(employer.placeId, employer);
      }

      pageToken = data.nextPageToken;
      page++;
    } while (pageToken && page < 3); // máximo 3 páginas = 60 resultados por query
  }

  return Array.from(allEmployers.values());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**NOTA:** Las 7 queries son una decisión de diseño. La investigación propone las queries arriba como punto de partida razonable para cubrir los tipos de empleadores de Val Thorens. [ASSUMED — ajustar si el planner tiene mejores queries]

---

## Pattern 4: Gemini 2.0 Flash — Generación de email en francés

**Modelo correcto:** `gemini-2.0-flash` — el CLAUDE.md lo especifica y es el modelo a usar aunque haya versiones más nuevas disponibles. [CITED: ai.google.dev/gemini-api/docs/models/gemini]

**Nota importante:** Según la documentación de Google, `gemini-2.0-flash` está marcado como deprecated en favor de `gemini-2.5-flash`. Sin embargo, dado que el CLAUDE.md especifica explícitamente `gemini-2.0-flash`, se usa ese modelo. Si el planner quiere actualizar a `gemini-2.5-flash`, es un cambio trivial en una constante.

```typescript
// Source: https://ai.google.dev/api/generate-content (verificado 2026-05-31)
// lib/gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export interface CandidateData {
  name: string;
  jobTypes: string[];
  languages: string;
  availFrom: string;
  availTo: string;
  hasEUPassport: boolean;
}

export async function generateEmailBody(
  candidate: CandidateData,
  employer: { name: string; type?: string }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Escribe un email de candidatura en francés profesional y cordial.

Candidato: ${candidate.name}
Tipos de trabajo buscados: ${candidate.jobTypes.join(', ')}
Idiomas: ${candidate.languages}
Disponibilidad: del ${candidate.availFrom} al ${candidate.availTo}
${candidate.hasEUPassport ? 'Tiene pasaporte europeo.' : ''}

Empleador: ${employer.name}

El email debe incluir:
1. Presentación breve del candidato
2. Interés específico en trabajar en este establecimiento
3. Disponibilidad exacta mencionada
4. Idiomas hablados
5. Mención de que el CV se adjunta
6. Cierre cordial

Responde SOLO con el cuerpo del email, sin asunto, sin "Objet:", sin "\`\`\`".`;

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

## Pattern 5: Gmail API — Envío con adjunto PDF (MIME manual, sin librerías extra)

**Qué es:** Construcción manual de un mensaje MIME multipart/mixed con body texto y adjunto PDF, codificado en base64url, enviado via REST a Gmail API.

```typescript
// Source: https://developers.google.com/workspace/gmail/api/guides/sending (verificado 2026-05-31)
// lib/gmail.ts

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

  // Base64url encoding (reemplazar +, /, = estándar de base64)
  const encoded = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail send failed: ${response.status} — ${error}`);
  }
}
```

---

## Pattern 6: Google Sheets API — Append con Service Account

**Qué es:** Autenticación con credenciales de Service Account desde env var (JSON parseado), append de fila al sheet hardcodeado.

```typescript
// Source: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append (verificado 2026-05-31)
// lib/sheets.ts

import { google } from 'googleapis';

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

**Prerequisito:** La Service Account debe tener acceso de Editor al Google Sheet (compartir el sheet con el email de la service account). [ASSUMED — el sheet ya existe; verificar que la service account está añadida como editor]

---

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por qué |
|----------|-------------|------------------|---------|
| Base64url encoding | Función propia de encode | `Buffer.from(str).toString('base64').replace(...)` | Una línea; los reemplazos son conocidos y simples |
| Chromium en serverless | Instalar chromium desde apt | `@sparticuz/chromium` | Los binarios serverless tienen tamaño específico, flags especiales, y paths que Sparticuz ya maneja |
| OAuth token handling | Refresh logic propia | NextAuth v4 ya lo hace | El token ya está en `session.access_token` — no reimplementar |
| Retry exponencial para Gemini | Librería de retry | `for` loop con `Math.pow(2, attempt)` | La lógica es trivial; añadir dependencia no vale |
| MIME message con adjunto | `nodemailer` | Construcción manual (ver Pattern 5) | ~20 líneas; evita una dependencia adicional de 1MB+ |
| Service Account auth | JWT manual | `google.auth.GoogleAuth` de `googleapis` | La librería maneja la rotación de tokens internamente |

**Insight clave:** El stack de este proyecto (googleapis, @google/generative-ai, @sparticuz/chromium, puppeteer-core) cubre todos los problemas complejos. El código de la app es glue code — no se deben reimplementar capacidades que estas librerías ya ofrecen.

---

## Common Pitfalls

### Pitfall 1: Chromium no cierra el browser en caso de error

**Qué falla:** Si `page.goto()` lanza una excepción y el código no tiene `try/finally`, el proceso de Chromium queda zombie y la función serverless agota la memoria.

**Por qué ocurre:** Las funciones serverless comparten procesos entre invocaciones (warm start). Un browser sin cerrar consume memoria.

**Cómo evitar:** SIEMPRE usar `try/finally { await browser.close() }`.

**Señales de alerta:** Timeout de la función + alto consumo de memoria en Vercel logs.

---

### Pitfall 2: next_page_token de Places API no es inmediatamente válido (API Legacy)

**Qué falla:** En la Places API (Legacy), el `next_page_token` requería esperar ~2 segundos antes de ser usable. La Places API (New) no documenta este delay.

**Por qué ocurre:** Cache lag del lado de Google.

**Cómo evitar:** El sleep de 1 segundo por requisito DISC-05 ya actúa como buffer. Si aparecen errores `INVALID_REQUEST` al paginar, aumentar el sleep a 2000ms.

**Señales de alerta:** Respuesta vacía o error en la segunda página de resultados.

---

### Pitfall 3: base64url vs base64 estándar en Gmail API

**Qué falla:** La Gmail API requiere base64url (RFC 4648), que reemplaza `+` por `-`, `/` por `_`, y elimina el padding `=`. Si se envía base64 estándar, la API devuelve error 400.

**Por qué ocurre:** Las implementaciones en varios ejemplos online usan `btoa()` o `.toString('base64')` sin hacer los reemplazos.

**Cómo evitar:** Ver Pattern 5 — siempre aplicar los 3 reemplazos después de `.toString('base64')`.

**Señales de alerta:** Gmail API responde `400 Bad Request` con `Invalid base64 encoding`.

---

### Pitfall 4: `serverComponentsExternalPackages` necesario para Chromium

**Qué falla:** Next.js 14 con App Router bundlea todo el código de servidor por defecto. Los archivos binarios de `@sparticuz/chromium` no son JavaScript y el bundler falla al procesarlos.

**Por qué ocurre:** El bundler de Next.js trata de importar el módulo y encuentra archivos `.br` (Brotli) que no son JS.

**Cómo evitar:** Añadir en `next.config.mjs`:
```javascript
experimental: {
  serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}
```

**Señales de alerta:** Error de build `Cannot find module` o `Invalid or unexpected token` al importar chromium.

---

### Pitfall 5: `GOOGLE_SERVICE_ACCOUNT_JSON` como JSON dentro de env var

**Qué falla:** Las variables de entorno en Vercel no pueden contener saltos de línea raw. Las claves privadas de Service Account contienen `\n`. Si la variable se copia mal (con saltos de línea literales en lugar de `\n`), el `JSON.parse` falla.

**Por qué ocurre:** El JSON de la service account tiene la private_key con `\n` como caracteres de escape, no como newlines literales.

**Cómo evitar:** En Vercel, configurar el env var pegando el JSON completo en una sola línea o usando el modo "raw" de Vercel env vars. Verificar con `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)` en tiempo de ejecución.

**Señales de alerta:** `SyntaxError: Unexpected token` al parsear la variable.

---

### Pitfall 6: access_token de OAuth expira (~1 hora)

**Qué falla:** Los access_token de Google OAuth expiran en 3600 segundos. Si el pipeline tarda más de 1 hora, los calls a Gmail API fallarán con 401.

**Por qué ocurre:** OAuth access_token tienen vida corta por diseño.

**Cómo evitar:** Para v1, el pipeline de Val Thorens (~60-100 empleadores × ~8s = 8-13 minutos) está muy por debajo del límite de 1 hora. No es un blocker para v1.

**Señales de alerta:** Gmail API responde 401 después de muchos minutos de ejecución.

---

### Pitfall 7: SSE se corta si el cliente desconecta (Vercel)

**Qué falla:** Vercel puede cortar la conexión SSE si el cliente cierra el browser o hay un timeout de red. El ReadableStream en el servidor sigue ejecutando el pipeline aunque nadie escuche.

**Por qué ocurre:** El pipeline es fire-and-forget desde el punto de vista del stream — el servidor no sabe que el cliente se desconectó.

**Cómo evitar:** Para v1, esto es aceptable — el pipeline termina, los emails ya se enviaron. No añadir lógica de cancelación en v1.

---

## State of the Art

| Aproximación anterior | Aproximación actual | Cambio | Impacto |
|----------------------|---------------------|--------|---------|
| Puppeteer full package | `puppeteer-core` + `@sparticuz/chromium` | 2022+ | Sin puppeteer full = deploy en Vercel posible |
| Places API (Legacy) con `next_page_token` delay requerido | Places API (New) con `pageToken` inmediato | 2023 | El delay de 2s ya no es necesario |
| `@google/generative-ai` v0.1.x (solo Gemini 1.0) | `@google/generative-ai` v0.24.x (Gemini 2.0 Flash) | 2024 | API más limpia, modelos más rápidos |
| Gemini 2.0 Flash | Gemini 2.5 Flash (recomendado por Google) | 2025 | 2.0 Flash deprecated; funciona pero se aconseja migrar post-v1 |

**Deprecated/outdated:**
- `puppeteer` (full package): no usar — incompatible con Vercel por tamaño del binario de Chromium
- Places API Legacy (`maps.googleapis.com/maps/api/place/textsearch/json`): funciona pero la API (New) es más moderna y tiene mejor field masking

---

## Environment Availability

| Dependencia | Requerida por | Disponible | Versión | Fallback |
|------------|--------------|------------|---------|----------|
| Node.js | Todo el server-side | ✓ | v24.15.0 | — |
| `GOOGLE_MAPS_API_KEY` env var | Places API (DISC-01) | [verificar] | — | Sin esta var el discovery falla completamente |
| `GOOGLE_GEMINI_API_KEY` env var | Gemini (GEN-01) | [verificar] | — | Sin esta var la generación de emails falla |
| `GOOGLE_SERVICE_ACCOUNT_JSON` env var | Sheets API (SHTS-03) | [verificar] | — | Sin esta var el logging falla pero el envío puede continuar |
| `NEXTAUTH_SECRET` / Google OAuth env vars | Auth ya existente | ✓ | — | Implementado en Fase 1 |
| Vercel Pro plan | maxDuration: 300s | [verificar] | — | Sin Pro plan, maxDuration máximo es 60s — el pipeline abortaría |

**Dependencias faltantes bloqueantes:**
- Las API keys (`GOOGLE_MAPS_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`) deben estar configuradas en `.env.local` y en Vercel antes de que el pipeline funcione.

**Dependencias faltantes con fallback:**
- Si `GOOGLE_SERVICE_ACCOUNT_JSON` no está configurado, el pipeline puede enviar emails pero no loguear — implementar error handling graceful en `lib/sheets.ts`.

---

## Assumptions Log

| # | Claim | Sección | Riesgo si es incorrecto |
|---|-------|---------|------------------------|
| A1 | Las 7 queries propuestas (hotels, restaurants, bars, ski schools, shops, nightclubs, chalets) cubren bien los empleadores de Val Thorens | Pattern 3 (queries) | Puede resultar en menos empleadores de los esperados — ajustar queries |
| A2 | `serverComponentsExternalPackages` es necesario en `next.config.mjs` para `@sparticuz/chromium` | Pitfall 4 | Si no es necesario, no causa daño añadirlo; si es necesario y no se añade, el build falla |
| A3 | La service account del proyecto ya tiene acceso Editor al Google Sheet | Pattern 6 | Si no tiene acceso, el append fallará con 403 — corregir en Google Sheets sharing settings |
| A4 | Vercel Pro plan está activo para `maxDuration: 300` | Environment Availability | Si está en el plan gratuito, el pipeline se cortará a los 60 segundos |
| A5 | El `cvFilename` a usar en el adjunto puede ser un valor genérico como `CV.pdf` o el nombre del archivo original | Pattern 5 (MIME) | Ajuste menor — el formulario ya tiene acceso al nombre del archivo via `formData.cv.name` |

---

## Open Questions (RESOLVED)

1. **¿Las 7 queries cubren todos los tipos de empleadores relevantes?**
   - **RESOLVED:** Las 7 queries son suficientes para v1 — cubren los tipos principales de empleadores de Val Thorens. Ajustable post-deploy si los resultados de Places API son insuficientes.

2. **¿`scrape/route.ts` separado o todo en `run/route.ts`?**
   - **RESOLVED:** Usar `scrape/route.ts` separado, como indica CLAUDE.md. La separación ya está configurada en vercel.json con maxDuration=60s para scrape.

3. **¿`gemini-2.0-flash` o `gemini-2.5-flash`?**
   - **RESOLVED:** Usar `gemini-2.0-flash` siguiendo CLAUDE.md como fuente de verdad del proyecto. Si el modelo devuelve error 404 en producción (por deprecación efectiva del endpoint), actualizar la constante a `gemini-2.5-flash` como fix puntual en ese momento.
---

## Validation Architecture

> `workflow.nyquist_validation` no está explícitamente en `.planning/config.json` → tratar como habilitado.

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework | No hay tests configurados en el proyecto (greenfield) |
| Config file | Ninguno detectado |
| Quick run | `npm run lint` (único check disponible actualmente) |

### Phase Requirements → Test Map

| Req ID | Comportamiento | Tipo de test | Automatizable | Notas |
|--------|---------------|--------------|---------------|-------|
| DISC-01..05 | Discovery de empleadores con paginación y dedup | Unit | `jest` con mock de fetch | Requiere setup de Jest |
| SCRP-01..05 | Scraping de email de URLs reales | Integration | Manual/E2E con sites reales | Puppeteer en CI es complejo |
| GEN-01..04 | Generación de email + retry en 429 | Unit | Mock de API de Gemini | Verificar estructura del output |
| SEND-01..04 | Envío MIME con adjunto | Unit | Mock de Gmail API endpoint | Verificar el mensaje MIME |
| SHTS-01..03 | Append a Sheets | Unit | Mock de googleapis | Verificar parámetros del call |

### Wave 0 Gaps

Para este proyecto no hay framework de tests configurado. El planner puede optar por:
- Añadir Jest/Vitest en Wave 0 para unit tests de lib/*.ts
- O validar manualmente con un run de end-to-end en staging

**Recomendación pragmática:** Dado el scope y la naturaleza del proyecto (app privada para 5 usuarios), la validación manual end-to-end es suficiente para v1. El pipeline es lo suficientemente lineal como para verificarlo con una ejecución real.

---

## Security Domain

### Applicable ASVS Categories

| Categoría ASVS | Aplica | Control estándar |
|---------------|--------|-----------------|
| V2 Authentication | No (NextAuth ya maneja auth en Fase 1) | NextAuth v4 |
| V3 Session Management | No (ya implementado en Fase 1) | NextAuth session |
| V4 Access Control | Sí — endpoints de pipeline solo para usuarios autenticados | Verificar sesión en `run/route.ts` antes de ejecutar el pipeline |
| V5 Input Validation | Sí — body del POST a `/api/run` | Validar que `accessToken`, `cvBase64`, `name` existen antes de ejecutar |
| V6 Cryptography | No — no se generan claves; el access_token lo provee Google | — |

### Known Threat Patterns

| Patrón | STRIDE | Mitigación estándar |
|--------|--------|---------------------|
| SSRF via URL de website scrapeado | Tampering | No hay mitigación estricta para v1 — validar que la URL sea http/https antes de abrir con Puppeteer |
| Pipeline ejecutado por usuario no autenticado | Elevation of Privilege | Verificar sesión al inicio de `run/route.ts` con `getServerSession()` |
| `cvBase64` con contenido malicioso | Tampering | El CV se adjunta tal cual — no se ejecuta, solo se transmite como bytes |
| API keys expuestas en logs | Information Disclosure | Nunca loguear `accessToken`, `GOOGLE_GEMINI_API_KEY`, ni `GOOGLE_SERVICE_ACCOUNT_JSON` |

---

## Sources

### Primary (HIGH confidence)
- [Next.js App Router — Route Handlers + Streaming](https://nextjs.org/docs/app/api-reference/file-conventions/route) — SSE con ReadableStream verificado
- [Google Places API (New) — Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search) — endpoint, field mask, pagination verificados
- [Gmail API — Sending](https://developers.google.com/workspace/gmail/api/guides/sending) — MIME + base64url workflow verificado
- [Google Sheets API — values.append](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append) — parámetros y auth verificados
- [Gemini API — generateContent](https://ai.google.dev/api/generate-content) — model ID y call pattern verificados
- npm registry — versiones de `@sparticuz/chromium@149.0.0`, `puppeteer-core@25.1.0`, `@google/generative-ai@0.24.1`, `googleapis@173.0.0` verificadas

### Secondary (MEDIUM confidence)
- [Sparticuz/chromium README](https://github.com/Sparticuz/chromium) — launch pattern con puppeteer-core verificado via WebFetch (404 en raw, pero recuperado en WebSearch + npm description)
- Compatibilidad `@sparticuz/chromium@149` + `puppeteer-core@25.1.0` — confirmada via WebSearch con fuentes de la comunidad

### Tertiary (LOW confidence)
- Queries específicas para Val Thorens — propuesta del investigador, no verificada contra resultados reales de Places API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versiones verificadas en npm registry
- SSE pattern: HIGH — verificado en docs oficiales de Next.js
- Places API (New): HIGH — endpoint y pagination verificados en docs oficiales
- Gemini SDK: HIGH — patrón verificado en docs oficiales
- Gmail MIME pattern: MEDIUM — workflow documentado oficialmente pero ejemplo Node.js es manual (sin librería)
- Puppeteer/Chromium serverless: MEDIUM — patrón principal verificado; `serverComponentsExternalPackages` es ASSUMED
- Queries de Val Thorens: LOW — propuesta razonable sin verificar contra Places API real

**Research date:** 2026-05-31
**Valid until:** 2026-08-31 (stack estable; expirar antes si Google depreca 2.0-flash o cambia Places API)
