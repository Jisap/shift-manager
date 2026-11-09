# Plan de desarrollo — ShiftManager

Fases ejecutables derivadas de `shiftManager.md` (v1.7). Cada fase termina con verificación y registro de sesión.

## Fase 0 — Documentación y decisiones

Estado: **completada**.

- [x] Especificación `shiftManager.md` v1.3.
- [x] `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DEVELOPMENT_PLAN.md`.
- [x] Protocolo de sesión y plantilla.

## Fase 1 — Preparación

Objetivo: proyecto inicial funcional y verificable.

Tareas:

- [x] Crear proyecto Next.js 16 con App Router y TypeScript estricto.
- [x] Configurar Tailwind CSS v4 (CSS-first) e inicializar shadcn/ui (preset Nova con Radix).
- [x] Crear `convex/schema.ts` con las tablas de `DATABASE.md` y desplegarlo.
- [x] Integrar Convex Auth (email + contraseña) con `Password` provider.
- [x] Configurar ESLint y Prettier. Husky y lint-staged pendientes (requieren git).
- [x] Configurar Vitest y Playwright.
- [x] Definir scripts `dev`, `lint`, `typecheck`, `test`, `test:e2e` y documentarlos en `AGENTS.md`.
- [ ] CI de GitHub Actions con typecheck, lint y tests: workflow preparado en `.github/workflows/ci.yml`, pendiente de subir porque el token guardado no tiene el scope `workflow`.

Aceptación:

- `npm run dev` arranca la app.
- `npm run typecheck`, `npm run lint` y `npm run test` pasan.
- Registro e inicio de sesión funcionan contra Convex Auth.
- El esquema se despliega en un entorno de desarrollo.

## Fase 2 — Tipos de turno

- [x] CRUD de `shiftTypes` (crear, editar, archivar y duplicar).
- [x] Formulario con React Hook Form + Zod.
- [x] Soporte de intervalos múltiples, pausas y colores.
- [x] Validación en Convex y aislamiento por usuario.
- [x] E2E versionado de alta y duplicado (`e2e/shifts.spec.ts`).
- [ ] Tests unitarios del schema de turnos y E2E de edición/archivo.

Aceptación: el usuario gestiona sus turnos, incluidos nocturnos y partidos.

## Fase 3 — Patrones y motor

- [x] Crear y editar patrones semanales y rotativos.
- [x] Editor visual de `patternDays`.
- [x] Implementar `src/lib/engine` con el contrato de `shiftManager.md` §5.21.
- [x] `resolveDay` y `resolveRange` con zona horaria y DST.
- [x] Cambio de patrón sin reescribir historial (archivar + crear nuevo).
- [ ] Tests de los 24 casos de §12.1 (23 en el motor; caso 19 implementado en backend sin test automatizado).

Aceptación: dado un patrón y un rango, el motor resuelve todas las jornadas correctamente.

## Fase 4 — Calendario

- [x] Vista mensual.
- [x] Vista semanal.
- [x] Vista diaria y agenda (selector Mes / Semana / Día / Agenda).
- [x] Colores por turno, descansos y festivos (turnos, descansos y festivos manuales listos).
- [x] Excepciones puntuales (`scheduleOverrides`) desde el calendario.
- [x] Navegación entre meses y años (selector de año añadido a la cabecera).
- [x] Revisión responsive y de accesibilidad (celdas compactas en móvil, etiquetas accesibles y estados de hoy).

Aceptación: calendario legible y editable; una excepción por fecha.

## Fase 5 — Registro de horas

- [x] Registrar entrada, salida y pausas reales.
- [x] Calcular horas reales y compararlas con las previstas.
- [x] `expectedMinutes` como instantánea.
- [x] Registros sin turno planificado.
- [x] Declarar horas extra por día sobre el turno planificado: tramos, horario y total calculado.
- [x] Clasificar horas reales (normal, extra, festivo, festivo-extra) y contarlas, sin multiplicadores económicos.
- [x] Tests de cálculos y DST.

Aceptación: comparación fiable previsto/real.

## Fase 6 — Dashboard y estadísticas

- [x] Próximo turno y próximo descanso (`/dashboard`).
- [x] Resumen semanal y mensual.
- [x] Gráficos con Recharts (previstas frente a reales, agrupadas según el periodo).
- [x] Filtros por semana, mes, año e intervalo personalizado.
- [x] Tests de agregaciones en `src/lib/calculations/statistics.test.ts`.

Aceptación: panel útil y correcto.

## Fase 7 — Exportación

- [x] CSV en cliente (UTF-8 con BOM).
- [x] PDF en cliente con `@react-pdf/renderer`.
- [x] Calendario legible y resumen de horas.
- [x] E2E de descarga con Playwright (CSV y PDF, con usuario real).

Aceptación: datos exportables e íntegros.

## Fase 8 — PWA y optimización

- [x] `app/manifest.ts` e iconos.
- [x] Service Worker propio con las estrategias de `ARCHITECTURE.md`.
- [x] Página offline.
- [x] Verificar que no se cachean datos privados (tests del Service Worker).
- [ ] Optimización de rendimiento (medición pendiente).

Aceptación: instalable y sin fugas de datos por caché.

## Fase 9 — Mejoras posteriores

- [x] Vacaciones: saldo anual y registro de días.
- [x] Festivos manuales en el calendario.
- [x] Recordatorios de turno en cliente.
- [x] Perfil, zona horaria y recuperación de contraseña por OTP.
- [x] Modo oscuro con `next-themes`.
- [ ] Importación de calendarios de festivos.
- [ ] Verificación de email en el registro (opcional, fuera del MVP).

## Puertas de calidad

Una tarea está terminada cuando:

- Está implementada e integrada.
- Tiene validación en backend y tratamiento de errores.
- Es responsive y accesible.
- Tiene pruebas y no rompe lo existente.
- Está documentada y registrada en la sesión.

Cada PR debe pasar `tsc --noEmit`, ESLint, Vitest y Playwright.
