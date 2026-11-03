# Plan de desarrollo — ShiftManager

Fases ejecutables derivadas de `shiftManager.md` (v1.6). Cada fase termina con verificación y registro de sesión.

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
- [ ] CI de GitHub Actions con typecheck, lint y tests (se añadirá tras crear el repositorio; el archivo se retiró porque bloqueaba su creación).

Aceptación:

- `npm run dev` arranca la app.
- `npm run typecheck`, `npm run lint` y `npm run test` pasan.
- Registro e inicio de sesión funcionan contra Convex Auth.
- El esquema se despliega en un entorno de desarrollo.

## Fase 2 — Tipos de turno

- [x] CRUD de `shiftTypes` (crear, editar y archivar). Duplicar pendiente.
- [x] Formulario con React Hook Form + Zod.
- [x] Soporte de intervalos múltiples, pausas y colores.
- [x] Validación en Convex y aislamiento por usuario.
- [ ] Tests unitarios de validadores y E2E del CRUD versionados (smoke manual ya verificado).

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
- [ ] Vista semanal.
- [ ] Vista diaria y agenda.
- [x] Colores por turno, descansos y festivos (turnos, descansos y festivos manuales listos).
- [x] Excepciones puntuales (`scheduleOverrides`) desde el calendario.
- [ ] Navegación entre meses y años (meses listos; selector de año pendiente).
- [ ] Revisión responsive y de accesibilidad.

Aceptación: calendario legible y editable; una excepción por fecha.

## Fase 5 — Registro de horas

- [x] Registrar entrada, salida y pausas reales.
- [x] Calcular horas reales y compararlas con las previstas.
- [x] `expectedMinutes` como instantánea.
- [x] Registros sin turno planificado.
- [x] Declarar horas extra por día sobre el turno planificado: tramos, horario y total calculado.
- [ ] Clasificar horas reales (normal, extra, festivo, festivo-extra) y contarlas, sin multiplicadores económicos.
- [x] Tests de cálculos y DST.

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
