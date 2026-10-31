# Plan de desarrollo — ShiftManager

Fases ejecutables derivadas de `shiftManager.md` (v1.3). Cada fase termina con verificación y registro de sesión.

## Fase 0 — Documentación y decisiones

Estado: **completada**.

- [x] Especificación `shiftManager.md` v1.3.
- [x] `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DEVELOPMENT_PLAN.md`.
- [x] Protocolo de sesión y plantilla.

## Fase 1 — Preparación

Objetivo: proyecto inicial funcional y verificable.

Tareas:

- [x] Crear proyecto Next.js 16 con App Router y TypeScript estricto.
- [x] Configurar Tailwind CSS v4 (CSS-first). shadcn/ui pendiente.
- [x] Crear `convex/schema.ts` con las tablas de `DATABASE.md`. Despliegue pendiente.
- [ ] Integrar Convex Auth (email + contraseña).
- [x] Configurar ESLint y Prettier. Husky y lint-staged pendientes (requieren git).
- [x] Configurar Vitest y Playwright.
- [x] Definir scripts `dev`, `lint`, `typecheck`, `test`, `test:e2e` y documentarlos en `AGENTS.md`.
- [ ] CI de GitHub Actions con typecheck, lint y tests.

Aceptación:

- `npm run dev` arranca la app.
- `npm run typecheck`, `npm run lint` y `npm run test` pasan.
- Registro e inicio de sesión funcionan contra Convex Auth.
- El esquema se despliega en un entorno de desarrollo.

## Fase 2 — Tipos de turno

- [ ] CRUD de `shiftTypes` (crear, editar, archivar, duplicar).
- [ ] Formulario con React Hook Form + Zod.
- [ ] Soporte de intervalos múltiples, pausas y colores.
- [ ] Validación en Convex y aislamiento por usuario.
- [ ] Tests unitarios de validadores y E2E del CRUD.

Aceptación: el usuario gestiona sus turnos, incluidos nocturnos y partidos.

## Fase 3 — Patrones y motor

- [ ] Crear y editar patrones semanales y rotativos.
- [ ] Editor visual de `patternDays`.
- [ ] Implementar `src/lib/engine` con el contrato de `shiftManager.md` §5.21.
- [ ] `resolveDay` y `resolveRange` con zona horaria y DST.
- [ ] Cambio de patrón sin reescribir historial.
- [ ] Tests de los 24 casos de §12.1.

Aceptación: dado un patrón y un rango, el motor resuelve todas las jornadas correctamente.

## Fase 4 — Calendario

- [ ] Vista mensual y semanal.
- [ ] Vista diaria y agenda.
- [ ] Colores por turno, descansos y festivos.
- [ ] Excepciones puntuales (`scheduleOverrides`) desde el calendario.
- [ ] Navegación entre meses y años.
- [ ] Responsive y accesible.

Aceptación: calendario legible y editable; una excepción por fecha.

## Fase 5 — Registro de horas

- [ ] Registrar entrada, salida y pausas reales.
- [ ] Calcular horas reales y compararlas con las previstas.
- [ ] `expectedMinutes` como instantánea.
- [ ] Registros sin turno planificado.
- [ ] Tests de cálculos y DST.

Aceptación: comparación fiable previsto/real.

## Fase 6 — Dashboard y estadísticas

- [ ] Próximo turno y próximo descanso.
- [ ] Resumen semanal y mensual.
- [ ] Gráficos con Recharts.
- [ ] Filtros por semana, mes, año e intervalo.
- [ ] Tests de agregaciones.

Aceptación: panel útil y correcto.

## Fase 7 — Exportación

- [ ] CSV en cliente (UTF-8 con BOM).
- [ ] PDF en cliente con `@react-pdf/renderer`.
- [ ] Calendario legible y resumen de horas.
- [ ] E2E de descarga.

Aceptación: datos exportables e íntegros.

## Fase 8 — PWA y optimización

- [ ] `app/manifest.ts` e iconos.
- [ ] Service Worker propio con las estrategias de `ARCHITECTURE.md`.
- [ ] Página offline.
- [ ] Verificar que no se cachean datos privados.
- [ ] Optimización de rendimiento.

Aceptación: instalable y sin fugas de datos por caché.

## Fase 9 — Mejoras posteriores

Vacaciones, festivos importados, recordatorios y mejoras de estadísticas.

## Puertas de calidad

Una tarea está terminada cuando:

- Está implementada e integrada.
- Tiene validación en backend y tratamiento de errores.
- Es responsive y accesible.
- Tiene pruebas y no rompe lo existente.
- Está documentada y registrada en la sesión.

Cada PR debe pasar `tsc --noEmit`, ESLint, Vitest y Playwright.
