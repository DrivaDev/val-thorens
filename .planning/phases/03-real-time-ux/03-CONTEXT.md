# Phase 3: Real-Time UX - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the static spinner `LoadingView` in `app/page.tsx` with a live SSE-consuming progress view.
The view opens a `fetch` POST to `/api/run`, reads the streaming response body, renders each event
as a log line in real time, and on `complete` replaces the log with a summary card.

No new API routes. No new lib files. UI changes in `app/page.tsx` only (and possibly a new
`ProgressView` sub-component in the same file).

</domain>

<decisions>
## Implementation Decisions

### Log Display
- **D-01:** Una línea por evento SSE — cada evento agrega una nueva fila al log (no se colapsan por empleador).
- **D-02:** Iconos por tipo de evento con colores: verde=éxito (`sent`), rojo=error (`send_error`), gris=skip (`scraping` con email null), azul/neutro=progreso (`searching`, `discovery_complete`, `generating`, `logged`).
- **D-03:** Área de log con altura fija y scroll (`max-h-80 overflow-y-auto`). Auto-scroll al último evento.
- **D-04:** Header del card durante el pipeline: mensaje fijo ("Proceso en curso...") — sin contador en tiempo real.

### Tarjeta de Resumen Final
- **D-05:** Al llegar el evento `complete`, el log se **reemplaza** por la tarjeta de resumen (el log desaparece).
- **D-06:** Datos del resumen: emails enviados count + empleadores omitidos count + confirmación Sheets ("Registrado en Google Sheets"). Cubre exactamente PROG-04.
- **D-07:** Botón de reset tiene texto exacto: **"Volver al formulario"**.
- **D-08:** Si el pipeline falla fatalmente (error en discovery), el evento `complete` igual se emite con 0/0. El resumen normal maneja este caso — no se necesita pantalla de error separada.

### Iniciación del SSE (no discutido, decisión de Claude)
- **D-09 (Claude):** El formulario llama a `fetch('/api/run', {method: 'POST', ...})` y pasa el `Response` object al nuevo `ProgressView`. `ProgressView` recibe la respuesta ya iniciada y lee el stream con `response.body.getReader()`. Esto evita duplicar la lógica de fetch y mantiene el `accessToken` y datos del form en el mismo scope donde se inició.

### Errores en el log (no discutido, decisión de Claude)
- **D-10 (Claude):** Eventos `send_error` se muestran como líneas rojas en el log (igual que otras líneas). Sin panel separado.

### Claude's Discretion
- Iniciación del SSE: Claude implementa passthrough del Response desde el form handler al ProgressView.
- Errores en el log: líneas rojas inline, sin panel separado.
- Icono/símbolo exacto por evento: Claude elige emojis o iconos Lucide coherentes con el diseño existente.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Código existente (CRÍTICO)
- `app/page.tsx` — Contiene todo el frontend. El nuevo `ProgressView` va aquí. Patrones existentes: `Card` component, `FlyingBackground`, colores `french-blue`/`french-red`, estado `view` en `Home`.
- `app/api/run/route.ts` — Pipeline SSE orchestrator. Tipos de eventos emitidos: `searching`, `discovery_complete`, `scraping`, `generating`, `sent`, `logged`, `send_error`, `complete`. Ver la función `sseEvent()` y la estructura del `ReadableStream`.

### Requisitos
- `PROG-01` a `PROG-05` en `.planning/REQUIREMENTS.md` — Todos los requisitos de esta fase.

### Decisiones de fases previas
- `.planning/STATE.md` §Accumulated Context — Decisiones técnicas claves (SSE via ReadableStream, authOptions, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (app/page.tsx:265) — Card con franja tricolor francesa. Reusar para `ProgressView` y tarjeta de resumen.
- `FlyingBackground` component (app/page.tsx:137) — Fondo animado. Reusar en la vista de progreso igual que en `LoginView` y `FormView`.
- `Loader2` de lucide-react — Ya importado, usar para spinner durante el pipeline.
- Tailwind colors: `text-french-blue`, `text-french-red`, `bg-french-blue`, `border-french-red` — ya configurados.

### Established Patterns
- Estado `view: "login" | "form" | "loading"` en `Home` — Agregar `"progress"` o reemplazar `"loading"` con `"progress"`.
- Fetch del formulario: actualmente llama `fetch("/api/run", {...}).catch(() => {})` sin consumir el response. Cambiar para pasar el response al ProgressView.
- SSE via `ReadableStream` + `TextDecoder` + `getReader()` — patrón estándar en Next.js App Router.
- Eventos SSE parseados como `JSON.parse(line.replace('data: ', ''))`.

### Integration Points
- `FormView.handleSubmit` → inicia el fetch POST → obtiene el `Response` → transiciona al estado `"progress"` pasando el response.
- `Home` component gestiona el estado global y pasa el response al `ProgressView`.
- `ProgressView` recibe `response: Response` y llama `response.body!.getReader()` al montar.

</code_context>

<specifics>
## Specific Ideas

- El usuario confirmó explícitamente el texto "Volver al formulario" para el botón de reset.
- El resumen reemplaza el log (no se mantienen ambos visibles) — elección consciente del usuario.
- Header con mensaje fijo "Proceso en curso..." (sin contador dinámico) — elección consciente del usuario.

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 3-Real-Time UX*
*Context gathered: 2026-05-31*
