# ShiftManager

Aplicación web para organizar turnos laborales, calendarios rotativos, horas trabajadas y estadísticas personales.

Sustituye calendarios improvisados y hojas de cálculo por una vista clara del horario previsto, las excepciones y las horas reales.

## Estado

**Fases 1–7 y 10 completadas; Fases 8 y 9 parcialmente completadas.** Calendario, horas, estadísticas y exportación funcionando, con PWA instalable, Service Worker y página offline. Autenticación completa (registro, sesión y recuperación por OTP), perfil con zona horaria, modo oscuro, vacaciones, festivos manuales y recordatorios.

El 2026-11-10 se completó el rediseño mobile-first de la interfaz y la portada (hero a dos columnas, mockup de calendario, rejilla de funcionalidades y CTA dinámico), además de animaciones de entrada en formularios, paneles y menús.

La CI está versionada en `.github/workflows/ci.yml` (typecheck, lint y Vitest); queda confirmar su primera ejecución y añadir Playwright. Pendientes: importación de festivos, ampliación de tests de backend y E2E. La especificación está cerrada en `shiftManager.md` (v1.7).

## Documentación

| Documento                                    | Contenido                                                          |
| -------------------------------------------- | ------------------------------------------------------------------ |
| [`shiftManager.md`](shiftManager.md)         | Producto, alcance, stack y decisiones cerradas (fuente de verdad). |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)         | Capas, flujo de datos y convenciones técnicas.                     |
| [`DATABASE.md`](DATABASE.md)                 | Esquema de Convex, índices e invariantes.                          |
| [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) | Fases, tareas y criterios de aceptación.                           |
| [`AGENTS.md`](AGENTS.md)                     | Reglas para agentes de IA y protocolo de sesión.                   |
| [`docs/SESSION_LOG.md`](docs/SESSION_LOG.md) | Índice de sesiones de trabajo.                                     |

## Stack

- Next.js 16 (App Router) + TypeScript estricto.
- Convex (backend y base de datos) + Convex Auth.
- Tailwind CSS v4 + shadcn/ui.
- React Hook Form + Zod.
- date-fns v4 + `@date-fns/tz`.
- React Day Picker + Recharts.
- `@react-pdf/renderer` (PDF en cliente) + CSV propio.
- Vitest + Playwright.
- ESLint + Prettier + GitHub Actions.

## Funcionalidades del MVP

1. Registro e inicio de sesión.
2. Tipos de turno reutilizables (incluidos nocturnos y partidos).
3. Patrones semanales y rotativos.
4. Calendario mensual, semanal y diario.
5. Excepciones puntuales sobre días concretos.
6. Registro de horas reales frente a previstas.
7. Estadísticas por semana, mes y año.
8. Exportación a PDF y CSV.
9. Uso correcto en móvil y escritorio.

## Requisitos

- Node.js 20 o superior (probado con 24).
- npm 10 o superior.
- Cuenta de Convex para el backend.

## Puesta en marcha

```bash
npm install
npm run dev
```

Otros comandos:

| Comando             | Uso                         |
| ------------------- | --------------------------- |
| `npm run build`     | Build de producción.        |
| `npm run lint`      | ESLint.                     |
| `npm run typecheck` | TypeScript sin emitir.      |
| `npm run test`      | Tests unitarios con Vitest. |
| `npm run test:e2e`  | Tests E2E con Playwright.   |
| `npm run format`    | Formato con Prettier.       |

Backend desplegado en Convex. Para trabajar contra el deployment de desarrollo: `npx convex dev` (requiere iniciar sesión en Convex).

## Estructura prevista

```text
src/app/            rutas y layouts (App Router)
src/components/     componentes de UI y composición
src/features/       lógica por dominio
src/lib/engine/     motor puro de turnos
src/lib/            fechas, cálculos, validadores, i18n
src/types/          tipos compartidos
convex/             esquema, queries y mutations
docs/               sesiones y documentación operativa
```

## Principios

- **Sencillez:** introducir y consultar horarios debe ser rápido.
- **Flexibilidad:** distintos patrones y tipos de jornada.
- **Fiabilidad:** fechas, zonas horarias y cálculos correctos.
- **Privacidad:** cada usuario solo accede a sus datos.
