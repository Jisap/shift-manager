# Base de datos — ShiftManager

Esquema de Convex derivado de `shiftManager.md` (v1.3). Todos los validadores usan la API `v.*` de Convex.

## 1. Convenciones

| Dato | Tipo | Formato |
| --- | --- | --- |
| Fecha de calendario | `string` | `YYYY-MM-DD` local |
| Hora de turno | `string` | `HH:mm` local |
| Instante real | `number` | epoch ms UTC |
| Zona horaria | `string` | IANA |
| Color | `string` | `#RRGGBB` |

- No se almacenan objetos `Date`.
- `_creationTime` actúa como fecha de creación; `updatedAt` se guarda solo en tablas editables.
- Catálogos con borrado lógico (`archivedAt`).
- Toda tabla de datos incluye `userId` e índice por usuario.

## 2. Autenticación

Las tablas de autenticación las define `@convex-dev/auth` (usuarios, sesiones, cuentas). La tabla `users` se amplía con:

- `timezone: string`
- `locale: string`
- `name: string`
- `email: string`
- `onboardingCompleted: boolean`
- `preferences: object`

Índice: `by_email`.

## 3. Tablas de dominio

### shiftTypes

```ts
{
  userId: v.id("users"),
  name: v.string(),
  color: v.string(),
  description: v.optional(v.string()),
  intervals: v.array(v.object({ start: v.string(), end: v.string() })),
  breaks: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
  breakMinutes: v.number(),
  breakPaid: v.boolean(),
  archivedAt: v.optional(v.number()),
  updatedAt: v.number(),
}
```

Índices: `by_user(userId)`, `by_user_archived(userId, archivedAt)`.

- Varios intervalos modelan jornadas partidas; el hueco entre ellos no es trabajo.
- `breaks` guarda los descansos con hora de inicio y fin; `breakMinutes` es su suma y la calcula el backend.
- `isOvernight` se deriva (`end <= start`), no se almacena.
- `archivedAt` en lugar de borrado físico si está en uso.

### shiftPatterns

```ts
{
  userId: v.id("users"),
  name: v.string(),
  type: v.union(v.literal("weekly"), v.literal("rotating")),
  cycleLength: v.number(),
  anchorDate: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  archivedAt: v.optional(v.number()),
  updatedAt: v.number(),
}
```

Índices: `by_user(userId)`, `by_user_active(userId, archivedAt)`.

- `weekly`: `anchorDate` es lunes y `cycleLength` = 7.
- `rotating`: `anchorDate` es el día 0 del ciclo.
- Sin patrones activos solapados por usuario.

### patternDays

```ts
{
  patternId: v.id("shiftPatterns"),
  dayIndex: v.number(),
  isRestDay: v.boolean(),
  shiftTypeId: v.optional(v.id("shiftTypes")),
}
```

Índices: `by_pattern(patternId)`, `by_pattern_day(patternId, dayIndex)`.

- Exactamente un registro por `(patternId, dayIndex)`.
- `shiftTypeId` obligatorio si `isRestDay` es `false`.

### scheduleOverrides

```ts
{
  userId: v.id("users"),
  date: v.string(),
  kind: v.union(v.literal("shift"), v.literal("rest"), v.literal("extra")),
  shiftTypeId: v.optional(v.id("shiftTypes")),
  intervals: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
  notes: v.optional(v.string()),
  updatedAt: v.number(),
}
```

Índice: `by_user_date(userId, date)`.

- Máximo una excepción por `(userId, date)`; la mutation devuelve `CONFLICT`.
- `intervals` permite cambiar horas solo para ese día.

### timeEntries

```ts
{
  userId: v.id("users"),
  date: v.string(),
  // Opcionales: permiten registrar solo horas extra sobre el turno planificado.
  actualStart: v.optional(v.number()),
  actualEnd: v.optional(v.number()),
  intervals: v.optional(v.array(v.object({ start: v.number(), end: v.number() }))),
  breakMinutes: v.number(),
  expectedMinutes: v.optional(v.number()),
  // Horas extra declaradas por el usuario para ese turno.
  overtimeIntervals: v.optional(v.array({ start: v.string(), end: v.string() })),
  overtimeMinutes: v.optional(v.number()),
  shiftTypeId: v.optional(v.id("shiftTypes")),
  notes: v.optional(v.string()),
  updatedAt: v.number(),
}
```

Índice: `by_user_date(userId, date)`.

- No referencia `ScheduledShift`: el calendario es derivado.
- Puede existir sin turno planificado.
- `actualEnd > actualStart` cuando se registran horas reales.
- `intervals` guarda el tramo real como instantes UTC; `breakMinutes` descuenta las pausas.
- Los minutos reales netos se calculan como `actualEnd - actualStart - breakMinutes`.
- `expectedMinutes` es una instantánea para no alterar el histórico.
- Las horas extra son explícitas: el usuario las declara con sus tramos `HH:mm`;
  el backend calcula `overtimeMinutes` con la zona horaria del usuario.

### holidays

```ts
{
  userId: v.id("users"),
  date: v.string(),
  name: v.string(),
  scope: v.union(
    v.literal("national"),
    v.literal("regional"),
    v.literal("local"),
    v.literal("personal")
  ),
}
```

Índices: `by_user_date(userId, date)`, `by_user_year(userId, date)`.

### vacationBalances

```ts
{
  userId: v.id("users"),
  year: v.number(),
  allocatedDays: v.number(),
  usedDays: v.number(),
}
```

Índice: `by_user_year(userId, year)`.

## 4. Relaciones

```text
users 1─N shiftTypes
users 1─N shiftPatterns 1─N patternDays N─1 shiftTypes
users 1─N scheduleOverrides N─1 shiftTypes
users 1─N timeEntries    N─1 shiftTypes
users 1─N holidays
users 1─N vacationBalances
```

## 5. Invariantes

1. `userId` siempre presente en tablas de dominio y siempre indexado.
2. Ninguna mutation acepta `userId` del cliente.
3. Las referencias se validan contra el usuario autenticado.
4. Una excepción por usuario y fecha.
5. Un patrón activo cubre cada fecha como máximo una vez.
6. Sin registros huérfanos: antes de archivar se comprueba el uso.

## 6. Persistido frente a derivado

- **Persistido:** catálogos, patrones, días de patrón, excepciones, horas reales, festivos, vacaciones.
- **Derivado al leer:** jornada efectiva de cada fecha (`ResolvedDay`).
- No se materializan jornadas sin excepción ni rangos anuales completos.

## 7. Migraciones

- Todo cambio de esquema se documenta en `shiftManager.md` (changelog) y aquí.
- Los cambios incompatibles requieren migración de datos y una entrada de sesión.
- Los campos nuevos deben ser opcionales o tener valor por defecto antes de poblarse.
