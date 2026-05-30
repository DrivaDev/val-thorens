# Phase 1: Auth & Form - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 1-Auth & Form
**Areas discussed:** Diseño visual, Upload del CV

---

## Diseño visual

| Option | Description | Selected |
|--------|-------------|----------|
| Minimalista/limpio | Fondo blanco, tipografía clara, sin decoraciones | |
| Temático montaña | Colores frios (azul nieve, verde alpino), imagen de fondo | |
| Tú decides | Claude elige lo más razonable | |
| (Other) | Colores de Francia, identidad "The Annex" | ✓ |

**User's choice:** Colores de Francia (tricolor: azul, blanco, rojo). Grupo llamado "The Annex" que busca irse a Val Thorens — tener en cuenta para el diseño.
**Notes:** Usuario dio contexto adicional del grupo y su propósito, lo que define el branding de toda la app.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Solo light mode | Más simple, coherente con paleta Francia | ✓ |
| Solo dark mode | Estilo moderno, fondo oscuro con acentos tricolor | |
| Ambos (auto-sistema) | Respeta preferencia del sistema operativo | |

**User's choice:** Solo light mode

---

| Option | Description | Selected |
|--------|-------------|----------|
| Card centrada | Formulario en tarjeta centrada, fondo con color sutil | ✓ |
| Full-width / columna izquierda | Formulario ocupa todo el ancho | |
| Tú decides | Claude elige el layout | |

**User's choice:** Card centrada

---

| Option | Description | Selected |
|--------|-------------|----------|
| Logo/nombre del grupo + botón Google | "The Annex" como título, subtítulo corto, botón Sign in | ✓ |
| Solo el botón de Google | Mínimo absoluto, sin branding | |
| Landing con más info | Explica qué hace la app antes del login | |

**User's choice:** Logo/nombre del grupo + botón Google

---

## Upload del CV

| Option | Description | Selected |
|--------|-------------|----------|
| 5 MB | Suficiente para cualquier CV, evita subidas lentas | ✓ |
| 10 MB | Más holgado, para CVs con imágenes | |
| Sin límite explícito | Riesgo de timeouts en Vercel | |

**User's choice:** 5 MB

---

| Option | Description | Selected |
|--------|-------------|----------|
| Click + drag-and-drop | Zona de drop visible, estándar moderno | ✓ |
| Solo click (input file clásico) | Botón simple, funciona en móvil y desktop | |

**User's choice:** Click para seleccionar + drag-and-drop

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nombre + ícono check + botón quitar | "cv.pdf ✔" con X para descartar | ✓ |
| Solo nombre del archivo | Mínimo, sin botón de eliminar | |

**User's choice:** Nombre del archivo + ícono check + botón quitar

---

## Claude's Discretion

- Form validation style (inline per-field vs. top banner)
- Post-submit loading state (spinner/transition before Phase 3 SSE is built)
- Exact French tricolor hex values (blue `#0055A4`, red `#EF4135` or similar)

## Deferred Ideas

None — discussion stayed within phase scope.
