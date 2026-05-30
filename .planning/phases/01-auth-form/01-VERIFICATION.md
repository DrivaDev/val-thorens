---
phase: 01-auth-form
verified: 2026-05-29T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Iniciar sesion con Google funciona end-to-end"
    expected: "El usuario hace clic en 'Iniciar sesion con Google', se redirige a Google OAuth, y tras autenticarse regresa a la app mostrando el formulario con su email en el header"
    why_human: "Requiere credenciales OAuth reales, callback URL configurada en Google Cloud Console, y un usuario de prueba registrado. No es verificable con grep ni con build."
  - test: "El token access_token llega a session.access_token despues de login"
    expected: "Tras autenticarse, session.access_token contiene el bearer token de Gmail — necesario para que Phase 2 pueda llamar Gmail API"
    why_human: "El flujo JWT callback → session callback solo es observable en runtime. Requiere login real con Google y una herramienta de debug (NextAuth debug mode o console.log temporal en ruta protegida)."
  - test: "Enviar el formulario con datos validos transiciona a loading state"
    expected: "Con nombre, PDF <= 5MB, al menos un tipo de trabajo, idiomas y fechas — al hacer click en 'Enviar candidatura' la vista cambia a spinner con 'Iniciando proceso...'"
    why_human: "Comportamiento de navegacion y transicion de estado requiere prueba en el browser. El fetch a /api/run falla (no existe en Phase 1) pero onSubmitComplete() debe dispararse de todas formas."
---

# Phase 1: Auth & Form — Reporte de Verificacion

**Phase Goal:** Los usuarios pueden autenticarse de forma segura con Google y enviar todos los datos necesarios para ejecutar el pipeline.
**Verificado:** 2026-05-29
**Status:** human_needed
**Re-verificacion:** No — verificacion inicial

---

## Resumen de Goal Achievement

Todos los artefactos existen, son sustantivos y estan correctamente conectados. El codigo implementa exactamente lo especificado en los planes. No hay stubs ni placeholders en rutas criticas. La unica razon por la que el status no es `passed` es que 3 comportamientos requieren verificacion humana (OAuth end-to-end, token en sesion, transicion de estado post-submit).

---

## Observable Truths

| # | Truth | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | NextAuth Google provider configurado con scope gmail.send | VERIFIED | `app/api/auth/[...nextauth]/route.ts` linea 11: `scope: "openid email profile https://www.googleapis.com/auth/gmail.send"` — sin scopes de lectura de inbox |
| 2 | Session callback expone access_token para llamadas downstream | VERIFIED | `route.ts` linea 24: `session.access_token = token.access_token as string` — flujo JWT→session completo |
| 3 | tailwind.config.ts define french-blue (#0055A4) y french-red (#EF4135) | VERIFIED | `tailwind.config.ts` lineas 14-17: objeto `french: { blue: '#0055A4', red: '#EF4135' }` en `extend.colors` |
| 4 | Variables de entorno documentadas en .env.example | VERIFIED | `.env.example` contiene las 4 variables Phase 1 + 3 placeholders Phase 2 |
| 5 | Vercel maxDuration 300 para run route y 60 para scrape route | VERIFIED | `vercel.json`: `"app/api/run/route.ts": { "maxDuration": 300 }` y `"app/api/scrape/route.ts": { "maxDuration": 60 }` |
| 6 | Usuarios no autenticados ven Login screen con titulo y boton Google | VERIFIED | `app/page.tsx` lineas 42-85: `LoginView` con "The Annex", "Candidaturas Val Thorens", boton "Iniciar sesion con Google" — solo se renderiza cuando `status !== "authenticated"` |
| 7 | Usuarios autenticados ven Form screen (no login) | VERIFIED | `app/page.tsx` linea 470: guard `if (status === "authenticated")` antes de renderizar `FormView` |
| 8 | La pagina gestiona 3 estados de vista: login / form / loading | VERIFIED | `app/page.tsx` linea 464: `useState<"login" \| "form" \| "loading">("login")` |
| 9 | Loading state muestra spinner e "Iniciando proceso..." | VERIFIED | `app/page.tsx` lineas 88-103: `LoadingView` con `Loader2 animate-spin`, "Iniciando proceso...", "Esto puede tardar varios minutos.", `role="status"`, `aria-live="polite"` |
| 10 | Email del usuario visible en header del formulario (nunca preguntado en form) | VERIFIED | `app/page.tsx` linea 209: `{session.user?.email}` en card header de FormView |
| 11 | Usuario puede subir PDF CV con drag-and-drop y conversion Base64 en memoria | VERIFIED | `app/page.tsx` lineas 139-154: `handleFile()` valida `application/pdf` + `5*1024*1024`, usa `FileReader.readAsDataURL`, guarda en `cvBase64` state — nunca persiste a disco |
| 12 | Validacion muestra errores por campo en text-french-red | VERIFIED | `app/page.tsx`: `validate()` retorna los 5 mensajes exactos del UI-SPEC; cada campo muestra `<p className="text-sm text-french-red mt-1">` cuando hay error |
| 13 | Submit valido llama POST /api/run con cvBase64 y accessToken, transiciona a loading | VERIFIED | `app/page.tsx` lineas 168-199: `handleSubmit` llama `fetch("/api/run", { method: "POST", body: JSON.stringify({...cvBase64, accessToken: session.access_token}) })` y luego `onSubmitComplete()` |

**Score: 13/13 truths verificadas**

---

## Artefactos Requeridos

| Artefacto | Descripcion | Status | Detalles |
|-----------|-------------|--------|---------|
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler con Google provider, scope gmail.send, callbacks JWT + session | VERIFIED | 30 lineas, sustantivo, exporta GET y POST, scope correcto |
| `types/next-auth.d.ts` | Augmentacion TypeScript para Session.access_token y JWT.access_token | VERIFIED | Augmenta ambas interfaces (`Session` y `JWT`) con `access_token?: string` |
| `tailwind.config.ts` | Tokens de color french.blue y french.red | VERIFIED | `#0055A4` y `#EF4135` definidos bajo `extend.colors.french` |
| `.env.example` | Documentacion de env vars requeridas | VERIFIED | 4 vars Phase 1 + 3 placeholders Phase 2 |
| `vercel.json` | maxDuration 300 (run) y 60 (scrape) | VERIFIED | Configuracion exacta especificada en PLAN-01 |
| `app/page.tsx` | Componente 3-estados con todos los campos del formulario | VERIFIED | 492 lineas, sustantivo, contiene todos los campos, validacion, submit handler |
| `app/layout.tsx` | Root layout con Inter font y Providers | VERIFIED | Importa Inter, usa `<Providers>`, metadata "The Annex — Val Thorens", `lang="es"` |
| `app/providers.tsx` | SessionProvider wrapper "use client" | VERIFIED | Primera linea `"use client"`, exporta `Providers` con `SessionProvider` |
| `app/globals.css` | Directivas Tailwind base/components/utilities | VERIFIED | Exactamente 3 lineas @tailwind |

---

## Verificacion de Key Links

| Desde | Hacia | Via | Status | Detalles |
|-------|-------|-----|--------|---------|
| `route.ts` GoogleProvider | gmail.send scope | `authorization.params.scope` | WIRED | Linea 11: scope string incluye `https://www.googleapis.com/auth/gmail.send` |
| `route.ts` jwt callback | `token.access_token` | `token.access_token = account.access_token` | WIRED | Linea 19: asignacion correcta cuando `account` existe |
| `route.ts` session callback | `session.access_token` | `session.access_token = token.access_token` | WIRED | Linea 24: expone el token en la sesion del cliente |
| `app/page.tsx` LoginView | `signIn('google')` | `onClick` handler en boton | WIRED | Linea 488: `signIn("google")` llamado desde `onSignIn` callback |
| `app/page.tsx` | `useSession()` | import de `next-auth/react` + `SessionProvider` en providers.tsx | WIRED | Linea 2: import, linea 463: `useSession()`, providers.tsx envuelve la app |
| `app/page.tsx` FormView | `session.user.email` | renderizado en card header | WIRED | Linea 209: `{session.user?.email}` |
| CV file input / dropzone | `cvBase64` state | `FileReader.readAsDataURL` | WIRED | Lineas 148-153: `reader.readAsDataURL(file)` → `split(",")[1]` → `setFormData({...cvBase64})` |
| `handleSubmit` | `POST /api/run` | `fetch('/api/run', { method: 'POST' })` | WIRED | Linea 176-191: fetch con body JSON que incluye cvBase64 y accessToken |
| `handleSubmit` success | `onSubmitComplete()` | callback prop → `setView("loading")` | WIRED | Linea 192: `onSubmitComplete()` llamado inmediatamente tras iniciar fetch |

---

## Data-Flow Trace (Level 4)

| Artefacto | Variable de datos | Fuente | Produce datos reales | Status |
|-----------|------------------|--------|----------------------|--------|
| `app/page.tsx` LoadingView | Estatica (sin datos dinamicos) | N/A | N/A | N/A — componente estatico |
| `app/page.tsx` LoginView | `signingIn` boolean | `useState(false)` | N/A — estado UI local | N/A — controla UI, no datos |
| `app/page.tsx` FormView `session.user?.email` | Email del usuario | `useSession()` → NextAuth session | Depende de OAuth real | UNCERTAIN — correcto en codigo; verificable solo con login real |
| `app/page.tsx` FormView `cvBase64` | Base64 del PDF | `FileReader.readAsDataURL` | Si — convierte archivo real | FLOWING — logica completa, sin hardcode |

---

## Cobertura de Requirements

| Requirement | Plan | Descripcion | Status | Evidencia |
|-------------|------|-------------|--------|-----------|
| AUTH-01 | 01-02 | Usuario puede autenticarse con Google OAuth | VERIFIED | `LoginView` con `signIn("google")`, ruta NextAuth configurada |
| AUTH-02 | 01-01 | OAuth solicita scope gmail.send | VERIFIED | `route.ts` linea 11: scope incluye `gmail.send` unicamente |
| AUTH-03 | 01-01 | access_token persistido en session de NextAuth | VERIFIED | JWT callback + session callback en `route.ts`, augmentacion en `next-auth.d.ts` |
| AUTH-04 | 01-02 | Email del usuario tomado de sesion Google (no preguntado) | VERIFIED | `session.user?.email` en header de FormView; no hay campo email en el form |
| AUTH-05 | 01-02 | No autenticados ven login; autenticados ven form | VERIFIED | Guard `status === "authenticated"` en `Home` component |
| FORM-01 | 01-03 | Usuario puede ingresar nombre completo | VERIFIED | Input texto con `id="name"`, placeholder "Juan Garcia", validacion onBlur |
| FORM-02 | 01-03 | Usuario puede subir CV en PDF | VERIFIED | Dropzone + file input, validacion tipo/tamaño, FileReader Base64, drag-and-drop |
| FORM-03 | 01-03 | Usuario puede seleccionar tipo(s) de trabajo | VERIFIED | 6 checkboxes: Hotel, Restaurante, Bar, Escuela de ski, Tienda, Otro en grid-cols-2 |
| FORM-04 | 01-03 | Usuario puede ingresar idiomas (texto libre) | VERIFIED | Input con placeholder "Ej: Español, Frances, Ingles" y hint "Separalos por comas" |
| FORM-05 | 01-03 | Usuario puede ingresar fechas de disponibilidad (inicio y fin) | VERIFIED | Dos inputs `type="date"` en grid-cols-2 (Desde / Hasta) |
| FORM-06 | 01-03 | Enviar el formulario activa el pipeline | VERIFIED | `handleSubmit` llama `fetch("/api/run", { method: "POST" })` con todo el payload |

**Cobertura: 11/11 requirements de Phase 1 — todos verificados en codigo**

---

## Anti-Patrones Encontrados

| Archivo | Patron | Severidad | Impacto |
|---------|--------|-----------|---------|
| `app/page.tsx` lineas 188-191 | `.catch(() => {})` en fetch a `/api/run` — suprime error de red | INFO | Intencional en Phase 1 (documentado en SUMMARY-03). `/api/run` no existe aun. Phase 2 implementara la ruta. No es un bloqueante para el goal de Phase 1. |
| `app/page.tsx` linea 204 | `mx-auto` y `mx-4` en el mismo elemento (`max-w-lg mx-auto ... mx-4`) | INFO | Clases conflictivas de margin-x en el contenedor del form. `mx-4` sobrescribe `mx-auto`. Impacto visual menor (el form puede no estar centrado en pantallas anchas). No bloquea funcionalidad. |

No se encontraron stubs bloqueantes ni implementaciones vacias en rutas criticas.

---

## Verificacion Humana Requerida

### 1. Google OAuth end-to-end

**Test:** Abrir la app en `http://localhost:3000`, hacer click en "Iniciar sesion con Google", completar el flujo OAuth de Google, verificar que se regresa a la app y se muestra el formulario con el email del usuario en el header.
**Expected:** La app muestra `FormView` con el email del usuario en el card header. No se ve la pantalla de login.
**Why human:** Requiere GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET y NEXTAUTH_URL configurados en `.env`. Requiere que el callback `http://localhost:3000/api/auth/callback/google` este registrado en Google Cloud Console. Requiere que el usuario de prueba este en la lista de "Test users" del OAuth consent screen.

### 2. access_token disponible en sesion

**Test:** Tras autenticarse, abrir DevTools → Application → Cookies, leer la cookie `next-auth.session-token`. Alternativamente, agregar temporalmente `console.log(session.access_token)` en `FormView` y verificar en consola que tiene un valor no-undefined tras login.
**Expected:** `session.access_token` contiene un bearer token de Google (string no vacio, formato JWT).
**Why human:** El flujo de callbacks JWT → session solo es observable en runtime. El codigo es correcto estructuralmente pero el token solo existe si Google retorna `account.access_token` durante el callback, lo cual requiere login real con scope gmail.send autorizado.

### 3. Transicion a loading state tras submit valido

**Test:** Loguearse, llenar todos los campos (nombre, subir un PDF <= 5MB, seleccionar al menos un trabajo, idiomas, fechas), hacer click en "Enviar candidatura". Verificar que la vista cambia al spinner con "Iniciando proceso...".
**Expected:** La vista transiciona inmediatamente a `LoadingView` mostrando el spinner `Loader2` con "Iniciando proceso..." y "Esto puede tardar varios minutos.". El error de red del fetch a `/api/run` (que no existe) se suprime silenciosamente.
**Why human:** La transicion de estado React y el comportamiento del fetch fire-and-forget requieren interaccion real en el browser. No es verificable con analisis estatico de codigo.

---

## Conclusion

El codigo de Phase 1 esta completo y correcto. Los 13 must-haves estan verificados contra el codebase real. Los 11 requirements (AUTH-01 a AUTH-05, FORM-01 a FORM-06) tienen implementacion concreta y conectada. No hay stubs bloqueantes.

El status es `human_needed` — no `gaps_found` — porque no hay brechas de implementacion, sino 3 comportamientos que son correctos en codigo pero que solo se pueden confirmar completamente ejecutando la app con credenciales OAuth reales.

---

_Verificado: 2026-05-29_
_Verificador: Claude (gsd-verifier)_
