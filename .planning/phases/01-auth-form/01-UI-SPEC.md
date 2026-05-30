---
phase: 1
slug: auth-form
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-29
---

# Phase 1 — UI Design Contract: Auth & Form

> Visual and interaction contract para la Fase 1 (autenticación Google + formulario de candidatura).
> Generado por gsd-ui-researcher. Verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none (plain Tailwind CSS utility classes) |
| Icon library | lucide-react (checkmark, X, loader — solo 3 iconos necesarios) |
| Font | Inter (Tailwind default via font-sans) |

**Justificacion:** Proyecto greenfield sin shadcn inicializado. Stack es Next.js 14 + Tailwind CSS. Se usan clases utilitarias directamente sin capa de abstraccion de componentes de terceros.

---

## Spacing Scale

Valores declarados (multiples de 4px, alineados con escala Tailwind):

| Token | Value | Clase Tailwind | Usage |
|-------|-------|----------------|-------|
| xs | 4px | p-1 / gap-1 | Separacion entre icono y texto inline |
| sm | 8px | p-2 / gap-2 | Padding interno de badges, separacion entre label e input |
| md | 16px | p-4 / gap-4 | Padding interno de inputs, separacion entre campos del formulario |
| lg | 24px | p-6 / gap-6 | Padding interno de la card del formulario (horizontal) |
| xl | 32px | p-8 / gap-8 | Padding interno de la card del formulario (vertical), separacion entre secciones |
| 2xl | 48px | py-12 | Padding vertical de la pagina (arriba y abajo del contenedor centrado) |
| 3xl | 64px | — | Reservado para fases futuras — no se usa en Phase 1 |

Excepciones:
- Touch target minimo para el boton "X" de eliminar CV: 44px (h-11 w-11) — accesibilidad movil
- El boton "Iniciar sesion con Google" tiene padding asimetrico: py-3 px-6 para equilibrio visual con el logo de Google

---

## Typography

| Role | Size | Clase Tailwind | Weight | Clase Tailwind | Line Height | Usage |
|------|------|----------------|--------|----------------|-------------|-------|
| Display | 36px | text-4xl | 700 | font-bold | 1.2 | "The Annex" — titulo de la pantalla de login |
| Heading | 20px | text-xl | 700 | font-bold | 1.3 | Subtitulo de login "Candidaturas Val Thorens"; header de la card del formulario |
| Body | 16px | text-base | 400 | font-normal | 1.5 | Labels de campos, texto de ayuda, contenido general |
| Label/Small | 14px | text-sm | 400 | font-normal | 1.4 | Labels sobre inputs, texto de error inline, nombre de archivo subido |

**Regla de pesos:** Solo se usan exactamente 2 pesos. font-bold (700) para Display y Heading. font-normal (400) para Body y Label/Small. Nunca font-medium, font-semibold, font-light ni font-extrabold.

---

## Color

| Role | Hex | Clase Tailwind | Usage |
|------|-----|----------------|-------|
| Dominant (60%) | #FFFFFF | bg-white | Fondo de la card del formulario; fondo del boton de Google |
| Secondary (30%) | #F0F4F8 | bg-slate-100 | Fondo de pagina (sutil — no blanco puro); fondo del drag-and-drop zone en estado idle |
| Accent (10%) | #0055A4 | bg-blue-700 (custom) | Solo: boton primario "Enviar candidatura"; borde del drag-and-drop zone en estado active/hover; indicador de foco en inputs; links de accion secundaria (Cerrar sesion) |
| Destructive | #EF4135 | text-red-600 (custom) | Solo: mensajes de error inline de validacion; boton/icono X de eliminar CV |

**Mapa de la tricolor francesa:**
- Blanco (#FFFFFF): superficie principal — 60%
- Azul (#0055A4): accion y foco — 10%
- Rojo (#EF4135): errores y destructivos — semantico

**Nota sobre implementacion:** Los valores exactos #0055A4 y #EF4135 no estan en la paleta Tailwind por defecto. Se declaran como colores custom en `tailwind.config.ts`:
```
colors: {
  french: {
    blue: '#0055A4',
    red: '#EF4135',
  }
}
```
Las clases resultantes son `bg-french-blue`, `text-french-red`, `border-french-blue`.

Accent reservado para: boton submit principal, borde del dropzone en hover/drag-active, ring de foco de inputs (focus:ring-french-blue), links de accion secundaria (Cerrar sesion). NUNCA usar el azul como color de fondo de pagina, texto de body, o decoracion.

---

## Screens & Interaction Contract

### Pantalla 1: Login (estado no autenticado)

**Layout:** Pagina centrada verticalmente y horizontalmente. Fondo `bg-slate-100`. Card blanca con sombra `shadow-md rounded-2xl` de ancho maximo `max-w-sm` con padding `p-8`.

**Elementos (de arriba a abajo):**
1. Titulo "The Annex" — `text-4xl font-bold text-gray-900` — centrado
2. Subtitulo "Candidaturas Val Thorens" — `text-xl font-bold text-gray-500` — centrado, mt-2
3. Separador visual — `mt-8`
4. Boton "Iniciar sesion con Google" — ancho completo, `bg-white border border-gray-300 rounded-lg py-3 px-6 flex items-center gap-3 hover:bg-gray-50 transition-colors` — logo SVG oficial de Google a la izquierda, texto a la derecha

**Comportamiento:**
- Click en boton → `signIn('google')` de NextAuth → redireccion a Google OAuth
- Durante redirect: boton muestra estado deshabilitado con cursor-not-allowed

---

### Pantalla 2: Formulario (estado autenticado)

**Layout:** Pagina con `min-h-screen bg-slate-100 py-12`. Card centrada `max-w-lg mx-auto bg-white shadow-md rounded-2xl p-8`.

**Header de la card:**
- "The Annex" en `text-xl font-bold text-gray-900`
- Email del usuario (de sesion) en `text-sm text-gray-500` — sin que el usuario lo ingrese (AUTH-04)
- Link "Cerrar sesion" a la derecha — `text-sm text-french-blue hover:underline`

**Campos del formulario (de arriba a abajo, `gap-6` entre campos):**

#### Campo: Nombre completo (FORM-01)
- Label: "Nombre completo" — `text-sm font-normal text-gray-700`
- Input: `text-base w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-french-blue`
- Placeholder: "Juan Garcia"
- Error inline: "El nombre es obligatorio" — `text-sm text-french-red mt-1`

#### Campo: CV en PDF (FORM-02)
- Label: "Curriculum Vitae (PDF)" — `text-sm font-normal text-gray-700`
- Estado idle — Dropzone: `border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-french-blue transition-colors`
  - Texto: "Arrastra tu CV o haz click" — `text-sm text-gray-500`
  - Subtexto: "PDF · Max 5 MB" — `text-xs text-gray-400 mt-1`
- Estado drag-over: `border-french-blue bg-blue-50`
- Estado con archivo subido: reemplaza el dropzone con una fila `flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-gray-200`
  - Icono checkmark (lucide CheckCircle2) — `text-green-600 w-5 h-5`
  - Nombre del archivo — `text-sm font-normal text-gray-700 truncate`
  - Boton X (lucide X) — `ml-auto p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-french-red transition-colors` — 44px touch target minimo
- Error: "Solo se aceptan archivos PDF de hasta 5 MB" — `text-sm text-french-red mt-1`

#### Campo: Tipos de trabajo (FORM-03)
- Label: "Tipo de trabajo" — `text-sm font-normal text-gray-700`
- Opciones como checkboxes en grid `grid grid-cols-2 gap-2 mt-2`:
  - Hotel
  - Restaurante
  - Bar
  - Escuela de ski
  - Tienda
  - Otro
- Cada checkbox: `flex items-center gap-2 text-sm text-gray-700` con `accent-french-blue`
- Error: "Selecciona al menos un tipo de trabajo" — `text-sm text-french-red mt-1`

#### Campo: Idiomas (FORM-04)
- Label: "Idiomas que hablas" — `text-sm font-normal text-gray-700`
- Input text: `text-base w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-french-blue`
- Placeholder: "Ej: Español, Frances, Ingles"
- Texto de ayuda: "Separalos por comas" — `text-xs text-gray-400 mt-1`
- Error: "Indica al menos un idioma" — `text-sm text-french-red mt-1`

#### Campo: Disponibilidad (FORM-05)
- Label: "Disponibilidad" — `text-sm font-normal text-gray-700`
- Sub-layout: `grid grid-cols-2 gap-4 mt-2`
  - Desde: label `text-xs text-gray-500` + input `type="date"` con mismos estilos que text input
  - Hasta: label `text-xs text-gray-500` + input `type="date"`
- Error: "Indica las fechas de disponibilidad" — `text-sm text-french-red mt-1`

#### Boton submit (FORM-06)
- Texto: "Enviar candidatura" — `text-base font-bold`
- Estilos: `w-full bg-french-blue text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-french-blue focus:ring-offset-2`
- Estado deshabilitado (durante carga): `opacity-60 cursor-not-allowed`

**Validacion:** Inline por campo, activada en `onBlur` para cada campo y en `onSubmit` para todos. El error aparece debajo del campo afectado en `text-sm text-french-red mt-1`. No se usa banner superior. Los campos invalidos reciben `border-french-red` para indicacion visual adicional.

---

### Pantalla 3: Estado de carga post-submit (placeholder para Fase 3)

**Layout:** Mismo fondo `bg-slate-100`. Card centrada con los mismos estilos. Contenido:
- Spinner SVG animado (animate-spin) en `text-french-blue w-10 h-10 mx-auto`
- Texto: "Iniciando proceso..." — `text-base text-gray-600 mt-4 text-center`
- Subtexto: "Esto puede tardar varios minutos." — `text-sm text-gray-400 text-center mt-1`

El boton de submit se reemplaza por este estado al iniciar el fetch. No hay overlay modal ni bloqueo de pagina.

---

## Copywriting Contract

| Elemento | Copia exacta |
|----------|--------------|
| Titulo de login | The Annex |
| Subtitulo de login | Candidaturas Val Thorens |
| CTA de login | Iniciar sesion con Google |
| CTA de submit | Enviar candidatura |
| Dropzone — instruccion | Arrastra tu CV o haz click |
| Dropzone — restriccion | PDF · Max 5 MB |
| Dropzone — ayuda | Separalos por comas (en campo de idiomas) |
| Estado de carga — heading | Iniciando proceso... |
| Estado de carga — body | Esto puede tardar varios minutos. |
| Error — nombre vacio | El nombre es obligatorio |
| Error — CV formato/tamano | Solo se aceptan archivos PDF de hasta 5 MB |
| Error — tipo de trabajo vacio | Selecciona al menos un tipo de trabajo |
| Error — idiomas vacio | Indica al menos un idioma |
| Error — fechas vacias | Indica las fechas de disponibilidad |
| Error — fallo de red | Error al iniciar el proceso. Intentalo de nuevo. |
| Accion destructiva — eliminar CV | (sin confirmacion modal — la X elimina directamente; el archivo no se persiste) |
| Cerrar sesion | Cerrar sesion |

**Nota sobre acciones destructivas:** La unica accion destructiva en esta fase es eliminar el CV cargado. No requiere confirmacion modal porque el archivo solo existe en estado del componente (no hay persistencia), y el usuario puede volver a subirlo inmediatamente.

---

## Accesibilidad

- Todos los inputs tienen `id` y el label apunta con `htmlFor`
- El dropzone tiene `role="button"` y `aria-label="Cargar archivo PDF del curriculum"`
- El boton X de eliminar tiene `aria-label="Eliminar CV cargado"`
- El estado de carga tiene `role="status"` y `aria-live="polite"`
- Contraste minimo 4.5:1 en todo texto sobre fondos (verificado: azul #0055A4 sobre blanco pasa AA)
- Focus visible en todos los elementos interactivos con `focus:ring-2 focus:ring-french-blue`

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — shadcn not initialized |
| Third-party registries | none | not applicable — plain Tailwind only |

Solo se usa `lucide-react` para 3 iconos (CheckCircle2, X, Loader2). Es una dependencia estandar del ecosistema React, sin codigo de red ni eval dinamico.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-29
