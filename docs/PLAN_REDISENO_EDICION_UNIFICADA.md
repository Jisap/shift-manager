# Plan de Rediseño: Edición Unificada y Sencilla del Día

**Fecha:** 2026-11-11  
**Documento de diseño:** [Artifact generado en sesión](file:///C:/Users/VSPC-197933/.gemini/antigravity/brain/6d304eb6-7f2f-4ea7-bb65-fa970314d8c2/plan-redisenio-edicion-unificada.md)

---

## 1. Diagnóstico del Problema Actual

| Problema | Impacto en el usuario |
|---|---|
| **Separación en 4 pestañas** (*Turno/Excepción*, *Fichaje real*, *Horas extra*, *Festivos*) | Para un día normal con 2 horas extra, el usuario debe abrir una pestaña, luego otra distinta, tecleando horarios dos veces. |
| **Horas extra desconectadas de Horas reales** | Guardar horas extra no computa automáticamente como horas reales trabajadas a menos que se rellene expresamente el fichaje real, lo que genera balances en negativo en el Dashboard. |
| **Obligación de escribir tramos horarios (`HH:mm`)** | El usuario promedio solo sabe o quiere registrar: *"hice mi turno normal y me quedé 2 horas más"*, sin necesidad de calcular horas de inicio y fin. |
| **Cálculo de "Diferencia" confuso** | Al no estar unificado el total trabajado (ordinarias + extraordinarias), la métrica de balance arroja datos contradictorios. |

---

## 2. Propuesta de UX: Panel Diario Unificado (Single Sheet)

En lugar de saltar entre 4 pestañas, al tocar un día se abre un panel vertical limpio y estructurado en **3 bloques directos**:

```text
┌─────────────────────────────────────────────────────────────┐
│  Gestión del día: Miércoles 11 de Noviembre                 │
│  Turno planificado: Mañana (07:00 – 15:00 · 8 h)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. TURNO / ESTADO                                          │
│     [ Mañana (activo) ]  [ Tarde ]  [ Noche ]  [ Descanso ] │
│                                                             │
│  2. JORNADA TRABAJADA                                       │
│     [✓ Confirmar turno previsto (8 h)]                      │
│     O personalizar horario manual (desplegable opcional)    │
│                                                             │
│  3. HORAS EXTRAORDINARIAS                                   │
│     ¿Hiciste horas extra hoy?                               │
│     [ Ninguna ]  [ +1 h ]  [ +2 h ]  [ +3 h ]  [ Otro... ]  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  TOTAL DÍA: 10 h trabajadas  (Diferencia: +2 h)             │
│                                                             │
│  [ Guardar jornada completa ]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Principios de Funcionamiento

1. **Un solo botón para el 90% de los casos**:  
   Un botón destacado: **«Confirmar jornada prevista»**. Con un solo clic se asume que se entró y salió a la hora del turno asignado.
2. **Chips rápidos para Horas Extra**:  
   Píldoras de acceso rápido (`+30 min`, `+1 h`, `+2 h`, `+3 h`) o un selector numérico sencillo. No se exige horario de inicio/fin salvo que el usuario active "Modo detallado".
3. **Cálculo automático garantizado**:  
   $$\text{Horas reales totales} = \text{Horas del turno} + \text{Horas extra}$$
   La diferencia en el Dashboard siempre será matemáticamente coherente: si el turno era de 8 h y se sumaron 2 h extra, la diferencia será exactamente **`+2 h`**.
4. **Festivo como switch/toggle opcional**:  
   Un simple interruptor: `[ Marcar día como festivo trabajado ]`.

---

## 4. Hoja de Ruta para Mañana

### Paso 1: Backend Convex (`convex/timeEntries.ts`)
- [ ] Crear la mutación unificada `saveDayRecord`:
  - Recibe: `date`, `shiftTypeId` (o descanso), `confirmPlanned` (booleano), `overtimeMinutes` (número directo), `isHoliday`.
  - Actualiza en una sola transacción tanto la excepción del calendario como el fichaje de horas reales y las horas extra.

### Paso 2: Componente Unificado (`DayUnifiedEditor.tsx`)
- [ ] Sustituir la navegación por pestañas de `DayEditorSheet.tsx` por un único formulario vertical y limpio.
- [ ] Incluir selector de turno rápido con chips de colores.
- [ ] Añadir botón "Confirmar jornada prevista".
- [ ] Añadir selector de horas extra mediante chips numéricos (`+1h`, `+2h`, etc.).
- [ ] Mostrar resumen en vivo antes de guardar: *Total del día y balance resultante*.

### Paso 3: Integración en Móvil (`DayQuickActionsSheet.tsx`)
- [ ] Trasladar este mismo flujo simplificado al menú táctil inferior de dispositivos móviles.

### Paso 4: Verificación y Dashboard
- [ ] Verificar que al guardar un turno con 2 horas extra, el Dashboard refleje:
  - Horas previstas: 8 h
  - Horas reales: 10 h
  - Horas extra: 2 h
  - Diferencia: **+2 h (verde)**
