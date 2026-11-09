# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas para agentes de IA — ShiftManager

Este archivo es de lectura obligatoria antes de trabajar en el proyecto. No sustituye a `shiftManager.md`; lo resume y añade el protocolo operativo.

## 1. Orden de lectura al empezar

1. `shiftManager.md` — especificación de producto, arquitectura y decisiones cerradas.
2. `AGENTS.md` — este archivo.
3. `docs/SESSION_LOG.md` — índice de sesiones.
4. El archivo de sesión más reciente en `docs/sessions/`.

Si no se han leído los cuatro, no se debe modificar código.

## 2. Protocolo de sesión (obligatorio)

Ninguna sesión se considera cerrada sin dejar registro. El objetivo es que el siguiente agente continúe sin releer todo el historial.

### Ubicación

- Archivo por sesión: `docs/sessions/YYYY-MM-DD-HHmm-<agente>.md`.
- Índice: `docs/SESSION_LOG.md` (solo se amplía, nunca se reescribe).
- Plantilla: `docs/sessions/_TEMPLATE.md`.

### Al empezar

- [ ] Leer la última entrada de `docs/SESSION_LOG.md` y el archivo de sesión más reciente.
- [ ] Revisar el pendiente y el siguiente paso recomendado de esa sesión.
- [ ] Confirmar el estado actual (git, pruebas, entorno) antes de asumir nada.

### Al terminar

- [ ] Crear el archivo de sesión desde `_TEMPLATE.md`.
- [ ] Añadir una línea a `docs/SESSION_LOG.md`.
- [ ] Indicar pruebas ejecutadas y su resultado real.
- [ ] Listar el pendiente y el siguiente paso recomendado.
- [ ] No marcar tareas como hechas sin verificación.

Si la sesión se interrumpe, dejar el estado exacto y el comando para reproducirlo.

## 3. Fuente de verdad

- Producto, alcance y decisiones: `shiftManager.md` (versión actual 1.7).
- El registro de sesión documenta el trabajo, no las especificaciones.
- Un cambio de arquitectura o de stack debe justificarse y actualizar `shiftManager.md`.

## 4. Stack (resumen)

- Next.js 16 (App Router) + TypeScript estricto.
- Convex (backend, base de datos, validaciones) y Convex Auth.
- Tailwind CSS v4 (CSS-first) + shadcn/ui.
- React Hook Form + Zod.
- date-fns v4 + `@date-fns/tz`.
- React Day Picker, Recharts.
- `@react-pdf/renderer` (cliente) y CSV propio.
- Vitest (unitario), Playwright (E2E).
- ESLint + Prettier + GitHub Actions.

## 5. Convenciones clave

- No usar `any`.
- No confiar en validaciones de cliente: validar en Convex.
- `userId` se obtiene de la identidad, nunca del argumento del cliente.
- Fechas de calendario: `YYYY-MM-DD` local. Instantes: epoch ms UTC. Horas de turno: `HH:mm`.
- El calendario se calcula al leer; solo se persisten excepciones (`scheduleOverrides`).
- Una única excepción por usuario y fecha.
- Errores de backend con `ConvexError` y códigos estables.
- Textos de interfaz centralizados en `src/lib/i18n/messages.ts` (MVP en `es-ES`).
- Motor de turnos en `src/lib/engine/`, puro y sin acceso a base de datos.

## 6. Estructura objetivo

```text
src/app/
src/components/
src/features/
src/lib/{engine,dates,calculations,validators,i18n,utils}/
src/types/
convex/
docs/
  SESSION_LOG.md
  sessions/
```

## 7. Reglas de trabajo

1. Leer la documentación y el último registro antes de empezar.
2. No cambiar el stack ni una librería principal sin justificación y aprobación.
3. No tocar código ajeno a la tarea sin necesidad.
4. No duplicar funcionalidades ni componentes.
5. Mantener TypeScript estricto y evitar `any`.
6. Añadir pruebas para lógica importante, especialmente fechas y cálculos.
7. Verificar antes de dar por terminada una tarea.
8. Informar de dependencias, bloqueos y cambios de alcance.
9. Registrar la sesión antes de finalizar.

## 8. Comandos

- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Formato: `npm run format`
- Typecheck: `npm run typecheck`
- Tests: `npm run test`
- E2E: `npm run test:e2e`
- Convex (pendiente de login): `npx convex dev`

Antes de dar una tarea por terminada: `npm run typecheck`, `npm run lint` y `npm run test`.
