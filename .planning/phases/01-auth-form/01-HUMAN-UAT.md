---
status: partial
phase: 01-auth-form
source: [01-VERIFICATION.md]
started: 2026-05-29T00:00:00Z
updated: 2026-05-29T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Google OAuth end-to-end
expected: Hacer click en "Iniciar sesion con Google" en localhost:3000 redirige a Google, el usuario puede autenticarse con su cuenta, y es redirigido de vuelta con la sesión activa. La pantalla del formulario debe aparecer mostrando el email del usuario.
result: [pending]

### 2. access_token disponible en sesion
expected: Tras el login, `session.access_token` contiene el bearer token de Google OAuth. Verificar en el submit handler que `accessToken: session.access_token` no es `undefined` en el payload enviado a `/api/run`.
result: [pending]

### 3. Transicion a loading state tras submit valido
expected: Completar todos los campos del formulario con datos válidos (nombre, PDF ≤5MB, al menos un tipo de trabajo, idiomas, fechas con from < to) y hacer click en "Enviar candidatura". La vista debe transicionar inmediatamente al estado de loading mostrando el spinner y "Iniciando proceso...".
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
