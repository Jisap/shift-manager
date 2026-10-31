# Arquitectura — ShiftManager

Documento técnico derivado de `shiftManager.md` (v1.3). Describe cómo se organiza el sistema; las decisiones de producto están en la especificación.

## 1. Capas

```text
UI (Next.js App Router)
        │  queries / mutations reactivas
        ▼
Convex (persistencia, autorización, validación)
        │  datos cargados por rango
        ▼
Motor de turnos (src/lib/engine, función pura)
        │  ResolvedDay[]
        ▼
UI (calendario, dashboard, estadísticas, exportación)
```

Reglas:

- El motor no accede a base de datos ni a React.
- Convex no contiene lógica de presentación.
- La UI no calcula turnos por su cuenta: consume el resultado del motor.

## 2. Flujo de una lectura de calendario

1. La UI pide a una query el rango `[desde, hasta]` en fechas locales.
2. La query obtiene de Convex: patrones activos, días de patrón, excepciones y festivos del rango.
3. La query llama a `resolveRange()` con esos datos y la zona horaria del usuario.
4. Convex devuelve `ResolvedDay[]` ya resuelto.
5. La UI pinta el calendario y las estadísticas.

Ventaja: una sola fuente de verdad y sin materializar años de jornadas.

## 3. Estructura de carpetas

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── calendar/
│   │   ├── shifts/
│   │   ├── patterns/
│   │   ├── statistics/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx
├── components/{ui,layout,calendar,shifts,dashboard,shared}/
├── features/{shifts,patterns,calendar,time-entries,statistics,vacations}/
├── hooks/
├── lib/
│   ├── engine/          motor puro de turnos
│   ├── dates/           utilidades date-fns + @date-fns/tz
│   ├── calculations/    horas y agregaciones
│   ├── validators/      esquemas Zod compartidos
│   ├── i18n/            mensajes es-ES
│   └── utils/
├── types/
└── styles/
convex/
├── schema.ts
├── auth.ts
├── users.ts
├── shifts.ts
├── patterns.ts
├── scheduleOverrides.ts
├── timeEntries.ts
├── holidays.ts
├── vacations.ts
└── statistics.ts
```

## 4. Convención temporal

| Concepto | Tipo | Formato |
| --- | --- | --- |
| Fecha de calendario | `string` | `YYYY-MM-DD` local |
| Hora de turno | `string` | `HH:mm` local |
| Instante real | `number` | epoch ms UTC |
| Zona horaria | `string` | IANA (`Europe/Madrid`) |

- La zona horaria sale de `users.timezone`; nunca del dispositivo en el servidor.
- `date-fns` trabaja con fecha local; `@date-fns/tz` convierte a instantes.
- Las duraciones se calculan en minutos locales; las horas reales, con instantes UTC.
- DST: hora inexistente se rechaza; hora ambigua elige la primera ocurrencia con aviso.

## 5. Autenticación y autorización

- Convex Auth con email + contraseña y recuperación por OTP.
- `getAuthUserId(ctx)` en cada query/mutation privada.
- `userId` nunca se acepta como argumento del cliente.
- Toda referencia (`shiftTypeId`, `patternId`) se valida contra el usuario autenticado.
- La UI no es una barrera de seguridad.

## 6. Errores

- `ConvexError({ code, message })` con códigos estables.
- La UI traduce `code` a mensajes de `src/lib/i18n/messages.ts`.
- Códigos: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`.

## 7. Estado y caché

- Convex proporciona actualizaciones reactivas; no hay store global de calendario.
- El resultado del motor se memoiza solo en memoria del cliente.
- Nada de datos autenticados en localStorage, IndexedDB ni caché del Service Worker.
- La caché de red es responsabilidad de Convex y de Next.js para recursos estáticos.

## 8. PWA

- `app/manifest.ts` y Service Worker propio mínimo.
- Estáticos con hash: cache-first.
- Navegación: network-first con fallback offline.
- Datos de Convex: nunca cacheados.
- Sin edición offline en el MVP.

## 9. Pruebas

- **Vitest:** motor, fechas, cálculos, validadores.
- **Playwright:** flujos de autenticación, turnos, patrones, calendario, horas, exportación.
- El motor debe cubrir los 24 casos listados en `shiftManager.md` §12.1.

## 10. Puertas de calidad

Cada PR debe pasar: `tsc --noEmit`, ESLint, Vitest y Playwright (preview). Sin excepciones.
