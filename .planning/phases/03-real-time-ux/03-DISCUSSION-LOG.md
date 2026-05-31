# Phase 3: Real-Time UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 3-Real-Time UX
**Areas discussed:** Granularidad del log, Tarjeta de resumen final

---

## Granularidad del log

| Option | Description | Selected |
|--------|-------------|----------|
| Una fila por evento (Recomendado) | Cada evento SSE agrega una nueva línea al log. Más detallado, más movimiento visual. | ✓ |
| Una fila por empleador | Una sola fila por empleador que cambia de estado. Más limpio pero menos cinético. | |
| Tú decide | Dejar que el agente elija. | |

**User's choice:** Una fila por evento

---

| Option | Description | Selected |
|--------|-------------|----------|
| Iconos por tipo (Recomendado) | 🔍 Buscando, ✔ descubiertos, ✉️ scraping, ⚠️ sin email, ✅ enviado, ❌ error. Colores: verde=éxito, rojo=error, gris=skip. | ✓ |
| Solo texto plano | Líneas sin iconos, estilo terminal/log. | |
| Tú decide | Dejar que el agente elija. | |

**User's choice:** Iconos por tipo

---

| Option | Description | Selected |
|--------|-------------|----------|
| Altura fija con scroll (Recomendado) | max-h-80 overflow-y-auto con auto-scroll al último evento. | ✓ |
| Crece con el contenido | El log expande el card. Puede quedar muy largo. | |

**User's choice:** Altura fija con scroll

---

| Option | Description | Selected |
|--------|-------------|----------|
| Contador de enviados en tiempo real (Recomendado) | "Enviando candidaturas... (12 enviados)". Se actualiza con cada evento 'sent'. | |
| Mensaje fijo | "Proceso en curso..." sin contador. Más simple. | ✓ |
| Tú decide | Dejar que el agente elija. | |

**User's choice:** Mensaje fijo ("Proceso en curso...")

---

## Tarjeta de resumen final

| Option | Description | Selected |
|--------|-------------|----------|
| Log queda arriba, resumen aparece abajo (Recomendado) | El usuario ve todo el historial + la tarjeta de resumen al final. | |
| Resumen reemplaza el log | El log desaparece y queda solo la tarjeta. Más limpio pero se pierde el historial. | ✓ |
| Modal/overlay sobre el log | Popup sobre el log. Más trabajo de implementación. | |

**User's choice:** Resumen reemplaza el log

---

| Option | Description | Selected |
|--------|-------------|----------|
| Enviados + omitidos + confirmación Sheets (Recomendado) | ✅ X emails enviados | ⏭ Y empleadores sin email | 📊 Registrado en Google Sheets | ✓ |
| Solo enviados y omitidos | Sin mención de Sheets. Más simple. | |
| Tú decides | Dejar que el agente elija. | |

**User's choice:** Enviados + omitidos + confirmación Sheets

---

| Option | Description | Selected |
|--------|-------------|----------|
| "Volver al formulario" | Directo, en español. Requerido por PROG-05. | ✓ |
| "Nueva candidatura" | Más orientado a acción. | |
| Tú decides | Dejar que el agente elija. | |

**User's choice:** "Volver al formulario"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar resumen igual con 0 enviados (Recomendado) | El evento 'complete' siempre se emite. Resumen normal con 0/0 + mensaje de error en el log. | ✓ |
| Pantalla de error separada | Estado de error distinto al resumen. Más trabajo, más complejo. | |

**User's choice:** Mostrar resumen igual con 0 enviados

---

## Claude's Discretion

- **Iniciación del SSE:** El formulario pasa el `Response` object al `ProgressView`. `ProgressView` lee el stream con `response.body.getReader()` al montar.
- **Errores en el log:** Eventos `send_error` se muestran como líneas rojas inline. Sin panel separado.
- **Icono/símbolo exacto por evento:** Claude elige emojis o iconos Lucide coherentes con el diseño existente.

## Deferred Ideas

None — la discusión se mantuvo dentro del scope de la fase.
