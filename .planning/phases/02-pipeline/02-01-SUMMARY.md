---
phase: 02-pipeline
plan: "01"
subsystem: build-config
tags: [dependencies, chromium, puppeteer, gemini, googleapis, next.js]
dependency_graph:
  requires: []
  provides: [pipeline-deps, chromium-bundler-exclusion]
  affects: [next.config.mjs, package.json]
tech_stack:
  added:
    - "@sparticuz/chromium@149.0.0"
    - "puppeteer-core@25.1.0"
    - "@google/generative-ai@0.24.1"
    - "googleapis@173.0.0"
  patterns:
    - "serverComponentsExternalPackages para excluir binarios de Chromium del bundler"
key_files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - next.config.mjs
decisions:
  - "Versiones exactas fijadas para @sparticuz/chromium y puppeteer-core (T-02-01-01 mitigación)"
  - "serverComponentsExternalPackages en lugar de webpack externals — compatible con Next.js 14 App Router"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-31"
  tasks_completed: 2
  files_changed: 3
---

# Phase 2 Plan 01: Deps + Next.js Config Summary

## One-Liner

4 dependencias del pipeline instaladas con versiones fijadas y next.config.mjs configurado con serverComponentsExternalPackages para excluir binarios Brotli de Chromium del bundler.

## What Was Built

### Task 1: Instalar dependencias del pipeline
Instalados los 4 paquetes necesarios para el pipeline de automatización:
- `@sparticuz/chromium@149.0.0` — binario Chromium serverless optimizado para Vercel
- `puppeteer-core@25.1.0` — compatible con Chromium 149, sin binario bundleado
- `@google/generative-ai@0.24.1` — SDK oficial de Gemini para generación de emails
- `googleapis@173.0.0` — cliente oficial para Gmail API y Sheets API

El paquete `puppeteer` completo NO fue instalado (incompatible con Vercel por tamaño del binario).

### Task 2: Configurar next.config.mjs
Agregado `serverComponentsExternalPackages` en la sección `experimental` de next.config.mjs para que Next.js 14 App Router no intente bundlear los archivos binarios `.br` (Brotli) de `@sparticuz/chromium`. Sin esta configuración, el build falla porque webpack no puede procesar archivos binarios que no son JavaScript.

`npm run build` pasa sin errores con la configuración aplicada.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `1c5c54a` | chore(02-01): install pipeline dependencies |
| Task 2 | `cc64b3b` | chore(02-01): configure next.config.mjs to exclude Chromium binaries from bundler |

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. This plan only modifies build configuration and installs dependencies.

| Flag | File | Description |
|------|------|-------------|
| None | — | Solo configuración de build; sin superficie de ataque nueva |

## Self-Check: PASSED

- [x] `package.json` contiene `@sparticuz/chromium: ^149.0.0`
- [x] `package.json` contiene `puppeteer-core: ^25.1.0`
- [x] `package.json` contiene `@google/generative-ai: ^0.24.1`
- [x] `package.json` contiene `googleapis: ^173.0.0`
- [x] `puppeteer` (paquete completo) NO está en package.json
- [x] `next.config.mjs` contiene `serverComponentsExternalPackages`
- [x] `npm run build` pasa sin errores
- [x] Commits `1c5c54a` y `cc64b3b` existen en el historial de git
