# ShiftManager

## Guía de producto, arquitectura y desarrollo para agentes de IA

**Versión:** 1.7  
**Estado:** Especificación ejecutable; decisiones técnicas cerradas  
**Objetivo:** Construir una aplicación web para gestionar turnos laborales, horarios, jornadas, horas trabajadas y estadísticas personales.

---

# 1. Visión del proyecto

ShiftManager es una aplicación web destinada a personas que trabajan con horarios rotativos, turnos fijos, ciclos de trabajo o calendarios laborales variables.

La aplicación permitirá al usuario organizar visualmente sus jornadas laborales, consultar sus próximos turnos, registrar las horas realmente trabajadas y comparar el horario previsto con el realizado.

El objetivo es ofrecer una herramienta sencilla, visual y práctica que sustituya a los calendarios improvisados, hojas de cálculo y anotaciones manuales.

## 1.1. Problema que queremos resolver

Muchas personas tienen dificultades para gestionar sus horarios laborales cuando:

- Trabajan a turnos rotativos.
- Alternan semanas de mañana y tarde.
- Tienen calendarios con ciclos de varios días o semanas.
- Trabajan algunos fines de semana y descansan otros.
- Tienen cambios puntuales de turno.
- Necesitan conocer las horas trabajadas durante un periodo.
- Quieren consultar rápidamente sus próximos días libres.
- Necesitan llevar un control personal de vacaciones y horas extraordinarias.

ShiftManager debe resolver estos problemas desde una interfaz clara y accesible.

## 1.2. Filosofía del producto

La aplicación debe cumplir cuatro principios:

1. **Sencillez:** introducir y consultar horarios debe ser rápido.
2. **Flexibilidad:** admitir diferentes tipos de jornadas y patrones laborales.
3. **Fiabilidad:** los cálculos de horas y fechas deben ser correctos.
4. **Privacidad:** cada usuario únicamente podrá consultar y modificar sus propios datos.

No queremos construir inicialmente un sistema de gestión empresarial ni de recursos humanos. El enfoque será la organización personal del trabajador.

---

# 2. Usuarios y escenarios de uso

## 2.1. Usuario principal

Persona que necesita organizar sus horarios laborales y consultar su calendario de trabajo.

## 2.2. Escenarios habituales

### Escenario A: Turnos fijos

Un usuario trabaja de lunes a viernes de 08:00 a 16:00.

### Escenario B: Turnos alternos

Un usuario alterna semanalmente:

- Semana 1: turno de mañana.
- Semana 2: turno de tarde.

### Escenario C: Ciclos rotativos

Un usuario trabaja:

- Dos días de mañana.
- Dos días de tarde.
- Dos días de descanso.
- El ciclo vuelve a comenzar.

### Escenario D: Horarios irregulares

Un usuario tiene horarios diferentes dependiendo del día de la semana.

### Escenario E: Modificaciones puntuales

Un usuario tiene asignado un turno de mañana, pero un día concreto necesita trabajar por la tarde.

La aplicación debe permitir modificar ese día sin alterar el patrón habitual.

---

# 3. Alcance funcional

El desarrollo se dividirá en funcionalidades esenciales y mejoras posteriores.

## 3.1. MVP: funcionalidades imprescindibles

### A. Gestión de usuarios

- Registro.
- Inicio y cierre de sesión.
- Recuperación de contraseña.
- Perfil personal.
- Configuración regional.
- Zona horaria del usuario.

### B. Gestión de turnos

El usuario podrá crear diferentes tipos de turno.

Ejemplos:

| Nombre   | Hora de inicio | Hora de finalización |
| -------- | -------------- | -------------------- |
| Mañana   | 06:30          | 14:30                |
| Tarde    | 14:30          | 22:30                |
| Noche    | 22:30          | 06:30                |
| Partido  | 09:00          | 13:00 y 16:00-20:00  |
| Descanso | -              | -                    |

Cada tipo de turno podrá tener:

- Nombre.
- Uno o varios intervalos de trabajo (cada uno con hora de inicio y de finalización).
- Color identificativo.
- Descripción opcional.
- Duración de descansos o pausas.
- Configuración de pausas remuneradas o no remuneradas.

Los turnos podrán atravesar la medianoche.

### C. Patrones de trabajo

El usuario podrá crear patrones de trabajo reutilizables.

Ejemplos:

**Patrón semanal:**

- Lunes: mañana.
- Martes: mañana.
- Miércoles: tarde.
- Jueves: tarde.
- Viernes: mañana.
- Sábado: descanso.
- Domingo: descanso.

**Patrón rotativo:**

- Día 1: mañana.
- Día 2: mañana.
- Día 3: tarde.
- Día 4: tarde.
- Día 5: descanso.
- Día 6: descanso.

El usuario deberá poder indicar:

- Nombre del patrón.
- Duración del ciclo.
- Día de inicio del ciclo.
- Turno correspondiente a cada día.
- Fecha desde la que se aplica.
- Fecha hasta la que se aplica, si procede.

### D. Calendario laboral

El calendario será el elemento central de la aplicación.

Debe permitir visualizar:

- Turnos asignados.
- Días de descanso.
- Vacaciones.
- Festivos.
- Cambios puntuales.
- Horas previstas.

Vistas necesarias:

- Mensual.
- Semanal.
- Diaria.
- Agenda/listado.

El calendario deberá permitir navegar entre meses y años.

Cada turno debe mostrar claramente:

- Nombre del turno.
- Hora de entrada.
- Hora de salida.
- Duración prevista.
- Color identificativo.

En dispositivos móviles debe priorizarse la legibilidad y la navegación táctil.

### E. Excepciones y cambios puntuales

El usuario podrá modificar un día concreto sin alterar el patrón general.

Ejemplos:

- Cambiar mañana por tarde.
- Marcar un día como descanso.
- Añadir una jornada extraordinaria.
- Modificar la hora de entrada.
- Modificar la hora de salida.
- Añadir una observación.

Las excepciones deben tener prioridad sobre el patrón habitual.

### F. Registro de horas trabajadas

El usuario podrá registrar las horas realmente trabajadas.

Datos:

- Fecha.
- Hora real de entrada.
- Hora real de salida.
- Pausas.
- Total de horas.
- Observaciones.

Debe ser posible comparar:

- Horas previstas.
- Horas realizadas.
- Diferencia entre ambas.

El registro real no debe modificar automáticamente el turno planificado.

### G. Estadísticas

La aplicación ofrecerá información resumida sobre la actividad laboral.

Indicadores iniciales:

- Horas trabajadas durante el mes.
- Horas trabajadas durante el año.
- Horas previstas.
- Diferencia entre horas previstas y realizadas.
- Número de jornadas.
- Días de descanso.
- Turnos de mañana.
- Turnos de tarde.
- Turnos de noche.
- Horas extraordinarias, si el usuario las identifica como tales.

Las estadísticas deben poder filtrarse por:

- Semana.
- Mes.
- Año.
- Intervalo personalizado.

### H. Exportación

El usuario podrá exportar sus datos.

Formatos iniciales:

- PDF.
- CSV.

El PDF debe presentar un calendario legible y un resumen de horas.

El CSV permitirá utilizar los datos en Excel, LibreOffice u otras herramientas.

---

# 4. Funcionalidades posteriores al MVP

No deben retrasar la primera versión funcional.

## 4.1. Vacaciones

- Registrar vacaciones.
- Consultar días utilizados.
- Consultar días disponibles.
- Definir el saldo anual.
- Consultar vacaciones por año.

El saldo inicial será introducido por el usuario. No se deben asumir automáticamente condiciones legales o convenios laborales.

## 4.2. Festivos

- Añadir festivos manualmente.
- Crear calendarios de festivos.
- Importar calendarios cuando exista una fuente fiable.
- Diferenciar festivos nacionales, autonómicos y locales.

## 4.3. Recordatorios

- Recordatorio del próximo turno.
- Aviso de cambio de turno.
- Aviso de próximo día de trabajo.
- Notificación configurable.

## 4.4. PWA

La aplicación deberá poder instalarse en dispositivos compatibles.

Objetivos:

- Icono en pantalla de inicio.
- Experiencia similar a una aplicación.
- Diseño adaptable.
- Carga rápida.
- Acceso limitado a determinadas funciones sin conexión.

La funcionalidad offline debe implantarse con prudencia. No se debe cachear información privada o autenticada mediante estrategias inseguras.

No se debe prometer sincronización offline completa hasta disponer de una estrategia clara para resolver conflictos entre cambios locales y datos del servidor.

---

# 5. Stack tecnológico

El proyecto utilizará tecnologías modernas, mantenibles y con buena integración entre ellas.

## 5.1. Stack principal

| Área                    | Tecnología                   |
| ----------------------- | ---------------------------- |
| Framework               | Next.js 16                   |
| Lenguaje                | TypeScript                   |
| Backend y base de datos | Convex                       |
| Autenticación           | Convex Auth                  |
| Estilos                 | Tailwind CSS v4              |
| Componentes UI          | shadcn/ui                    |
| Formularios             | React Hook Form              |
| Validación              | Zod                          |
| Fechas                  | date-fns v4                  |
| Zonas horarias          | @date-fns/tz                 |
| Calendario              | React Day Picker             |
| Gráficos                | Recharts                     |
| Exportación PDF         | @react-pdf/renderer          |
| Exportación CSV         | Generación propia en cliente |
| Lint y formato          | ESLint + Prettier            |
| Testing unitario        | Vitest                       |
| Testing E2E             | Playwright                   |
| CI                      | GitHub Actions               |
| Despliegue frontend     | Vercel                       |
| Backend                 | Convex                       |
| Aplicación instalable   | PWA (Service Worker propio)  |

## 5.2. Next.js 16

Se utilizará Next.js como framework principal.

Responsabilidades:

- Estructura de rutas.
- Layouts.
- Renderizado de componentes.
- Gestión de páginas públicas y privadas.
- Integración con Convex.
- Optimización de recursos.
- Metadatos y configuración de la aplicación.

Se utilizará App Router.

El proyecto debe mantener una separación clara entre componentes de servidor y componentes de cliente.

No convertir componentes completos en Client Components sin necesidad.

## 5.3. TypeScript

TypeScript será obligatorio.

Requisitos:

- Evitar el uso de `any`.
- Definir tipos compartidos.
- Utilizar tipos derivados cuando sea posible.
- Evitar duplicación de interfaces.
- Mantener los contratos entre frontend y backend.

## 5.4. Convex

Convex será responsable de:

- Persistencia de datos.
- Consultas.
- Mutaciones.
- Validaciones del backend.
- Gestión de datos por usuario.
- Actualizaciones reactivas.

Las funciones del backend deben estar organizadas por dominio.

Ejemplo:

```text
convex/
├── _generated/
├── schema.ts
├── users.ts
├── shifts.ts
├── patterns.ts
├── scheduleOverrides.ts
├── timeEntries.ts
├── holidays.ts
├── vacations.ts
└── statistics.ts
```

La estructura podrá evolucionar conforme crezca el proyecto.

Todas las consultas y mutaciones privadas deben comprobar la identidad del usuario y validar que los registros pertenecen a él.

Nunca se debe confiar únicamente en los filtros enviados desde el cliente.

## 5.5. Tailwind CSS v4

Se utilizará Tailwind CSS v4 mediante configuración CSS-first.

No crear un `tailwind.config.js` tradicional salvo que exista una necesidad técnica justificada.

Utilizar `@theme` para definir:

- Colores.
- Tipografías.
- Breakpoints.
- Espaciados.
- Otros tokens de diseño.

Ejemplo orientativo:

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-background: #f8fafc;

  --breakpoint-mdlg: 50rem;
}
```

Los componentes deben utilizar los tokens del sistema de diseño siempre que sea posible.

## 5.6. shadcn/ui

Se utilizará shadcn/ui como base de componentes.

Componentes especialmente relevantes:

- Button.
- Card.
- Dialog.
- Dropdown Menu.
- Select.
- Popover.
- Calendar.
- Tabs.
- Tooltip.
- Form.
- Sheet.
- Alert Dialog.
- Table.
- Badge.
- Input.
- Textarea.

Los componentes deberán adaptarse visualmente a la identidad de ShiftManager.

No se debe utilizar shadcn/ui como una plantilla visual sin personalización.

## 5.7. React Hook Form y Zod

React Hook Form gestionará los formularios.

Zod validará los datos introducidos por el usuario.

Se utilizarán especialmente en:

- Creación de turnos.
- Configuración de patrones.
- Edición de jornadas.
- Registro de horas.
- Configuración de vacaciones.

La validación importante también debe realizarse en el backend.

## 5.8. date-fns y zonas horarias

Se utilizará date-fns v4 para operaciones con fechas.

Se incorporará `@date-fns/tz` cuando sea necesario trabajar con zonas horarias.

Es imprescindible comprobar la compatibilidad entre las versiones instaladas.

La zona horaria no debe depender accidentalmente del dispositivo desde el que se accede.

La zona horaria del usuario debe estar configurada explícitamente. Como valor inicial para usuarios de España se podrá proponer:

```text
Europe/Madrid
```

El usuario podrá modificarla.

### Reglas importantes

- Diferenciar fecha local y timestamp.
- Evitar cálculos de jornadas basados exclusivamente en milisegundos cuando intervenga el horario de verano.
- Tener en cuenta cambios de horario.
- Gestionar turnos nocturnos.
- Gestionar jornadas que atraviesan la medianoche.
- Evitar errores al cambiar de mes o año.
- No asumir que todos los días tienen siempre 24 horas.

Las horas locales ambiguas o inexistentes durante los cambios de horario deben tratarse de manera explícita.

El sistema deberá definir cómo resolver esos casos y, cuando sea necesario, solicitar confirmación al usuario.

## 5.9. Calendario: React Day Picker

Se utilizará React Day Picker como solución inicial para:

- Selección de fechas.
- Navegación entre meses.
- Selección de intervalos.
- Integración con formularios.

Sin embargo, el calendario principal de turnos puede necesitar una cuadrícula mensual propia.

La decisión será:

- React Day Picker para selección y navegación de fechas.
- Componente de calendario personalizado para representar turnos, colores, horarios y excepciones.

No se debe forzar React Day Picker a resolver todas las necesidades visuales si termina complicando el mantenimiento.

Si el proyecto necesita funcionalidades avanzadas de calendario, se podrá evaluar FullCalendar, justificando su incorporación.

## 5.10. Recharts

Se utilizará Recharts para representar estadísticas.

Gráficos iniciales:

- Horas trabajadas por mes.
- Distribución de turnos.
- Horas previstas frente a realizadas.
- Evolución anual.

Los gráficos deben ser sencillos y legibles.

## 5.11. Testing

Se utilizarán:

**Vitest**

- Pruebas unitarias.
- Pruebas de funciones de cálculo.
- Pruebas de validaciones.
- Pruebas del motor de turnos.

**Playwright**

- Pruebas de navegación.
- Registro e inicio de sesión.
- Creación de patrones.
- Generación de calendarios.
- Edición de jornadas.
- Registro de horas.
- Exportación.

Las pruebas del motor de fechas serán prioritarias.

## 5.12. PWA

La aplicación deberá estar preparada para convertirse en una PWA instalable.

Se contemplarán:

- Web App Manifest.
- Iconos.
- Service Worker.
- Estrategias de caché.
- Página de fallback.
- Instalación en dispositivos compatibles.

La caché debe distinguir entre recursos estáticos y datos privados.

No se deben almacenar respuestas autenticadas en cachés compartidas o persistentes sin una estrategia de seguridad adecuada.

La primera versión offline puede limitarse a permitir la apertura de la aplicación y consultar recursos estáticos previamente descargados.

La edición offline y la sincronización posterior quedan fuera del MVP hasta definir un sistema fiable de resolución de conflictos.

## 5.13. Convención de fechas, horas y zonas horarias (decisión)

Esta convención es obligatoria y afecta a todo el proyecto.

| Concepto                | Representación                      | Ejemplo           |
| ----------------------- | ----------------------------------- | ----------------- |
| Fecha de calendario     | `string` `YYYY-MM-DD` en hora local | `"2026-03-29"`    |
| Hora dentro de un turno | `string` `HH:mm` en hora local      | `"22:00"`         |
| Instante real (evento)  | `number` epoch en milisegundos UTC  | `1774764000000`   |
| Zona horaria            | `string` IANA                       | `"Europe/Madrid"` |

Reglas:

- Convex no almacena objetos `Date`. Se usa `number` para instantes y `string` para fechas locales.
- Las fechas de calendario no se convierten a UTC al guardarlas; se guardan tal cual para evitar desfases de un día.
- Los instantes reales (`actualStart`, `actualEnd`) se guardan en UTC y se renderizan con la zona horaria del usuario.
- La zona horaria nunca se deduce del dispositivo en el servidor. Se lee de `users.timezone`.
- `date-fns` opera sobre la fecha local; `@date-fns/tz` se usa solo al convertir entre hora local e instante.
- Las duraciones se calculan en minutos locales, nunca restando milisegundos.

### Política ante cambios de horario (DST)

- Hora local inexistente (salto de primavera): se rechaza el registro y se pide al usuario otra hora.
- Hora local ambigua (repetición de otoño): por defecto se elige la primera ocurrencia; la UI avisa y permite elegir la segunda.
- Una jornada nocturna puede durar 7 u 9 horas reales en las fechas de cambio. El motor no debe forzar 8 horas.
- La duración prevista se calcula en minutos locales; la real, con los instantes UTC, y puede diferir en DST.

## 5.14. Autenticación (decisión)

Se usará **Convex Auth** (`@convex-dev/auth`) con proveedor email + contraseña.

- Motivo: es la solución nativa de Convex, define las tablas de autenticación dentro del mismo despliegue y evita sincronizar identidades externas.
- Recuperación de contraseña mediante código OTP enviado por email. El envío se hará con un proveedor transaccional (por ejemplo Resend) configurado por variables de entorno.
- No se implementa autenticación propia ni se guardan contraseñas en tablas propias.
- La identidad se obtiene siempre con `getAuthUserId(ctx)` en queries y mutations. Si es `null`, la función lanza error.
- Clerk queda como alternativa documentada solo si Convex Auth bloqueara el desarrollo; cambiarla requiere aprobación del coordinador.

## 5.15. Persistencia frente a cálculo (decisión)

El calendario **no se materializa**. No se generan filas para cada día de cada año.

- Se persisten: tipos de turno, patrones, días de patrón, excepciones, registros de horas, festivos y vacaciones.
- La jornada efectiva de una fecha se **calcula al leer** mediante una función pura del motor.
- Solo se guarda un registro cuando el usuario modifica un día concreto (`scheduleOverrides`).
- Ventajas: sin tareas de regeneración, sin duplicados, cambios de patrón instantáneos y sin límite de años.
- Consecuencia: `ScheduledShift` desaparece como tabla materializada. Las excepciones viven en `scheduleOverrides`.

## 5.16. Exportación (decisión)

- **CSV**: generación en cliente a partir de los datos ya consultados. Sin dependencias. UTF-8 con BOM para compatibilidad con Excel.
- **PDF**: generación en cliente con `@react-pdf/renderer`. Documento con el calendario del periodo y un resumen de horas.
- Motivo: los datos son privados y de tamaño reducido; generarlos en cliente evita exponerlos en un endpoint y evita ejecutar navegadores headless en el backend.
- Puppeteer/Playwright no se usan en producción para PDF. Playwright queda solo para E2E.
- Horas y fechas se formatean con la configuración regional del usuario.

## 5.17. PWA: estrategia concreta (decisión)

- Manifest mediante `app/manifest.ts` de Next.js.
- Service Worker propio y mínimo, registrado en cliente. No se usa `next-pwa` mientras no sea necesario.
- Estrategia de caché:
  - Recursos estáticos con hash: cache-first.
  - Navegaciones: network-first con fallback a página offline.
  - Respuestas de Convex y cualquier dato autenticado: **nunca** se cachean.
- La primera versión permite abrir la app y ver la página offline; no permite editar sin conexión.
- No se promete sincronización offline hasta definir resolución de conflictos.

## 5.18. Internacionalización (decisión)

- El MVP se publica únicamente en español (`es-ES`).
- Todos los textos visibles se centralizan en `src/lib/i18n/messages.ts`. No se escriben cadenas literales dispersas en componentes.
- `date-fns` usa el locale `es`.
- El formato de fecha y número sale de `users.locale`.
- La estructura de mensajes permitirá añadir otro idioma sin tocar componentes, pero no habrá selector de idioma en el MVP.

## 5.19. Calidad: lint, formato y CI (decisión)

- ESLint con la configuración de Next.js y reglas de TypeScript.
- Prettier para formato.
- Husky + lint-staged en pre-commit: lint y formato de los archivos modificados.
- GitHub Actions en cada PR:
  1. `tsc --noEmit`.
  2. `eslint`.
  3. `vitest run`.
  4. `playwright test` contra un preview.
- Un PR no se fusiona si falla cualquiera de los pasos.

## 5.20. Errores y observabilidad (decisión)

- El backend lanza `ConvexError` con un objeto `{ code, message }` y códigos estables: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`.
- El frontend traduce `code` a mensajes de interfaz; nunca muestra el mensaje crudo del backend.
- En desarrollo se usa el panel de logs de Convex. Sentry se evalúa después del MVP.
- No se registran datos personales innecesarios en logs (email completo, notas, horas concretas).

## 5.21. Contrato del motor de turnos (decisión)

El motor vive en `src/lib/engine/` y no importa Convex salvo tipos. Es lógica pura y testeable con Vitest.

```ts
export type LocalDate = string; // YYYY-MM-DD
export type LocalTime = string; // HH:mm

export interface ShiftInterval {
  start: LocalTime;
  end: LocalTime; // si end <= start, cruza medianoche
}

export interface ShiftTypeDefinition {
  id: string;
  intervals: ShiftInterval[];
  breaks?: ShiftInterval[];
  breakPaid?: boolean;
}

export interface PatternDefinition {
  id: string;
  type: "weekly" | "rotating";
  cycleLength: number;
  anchorDate: LocalDate;
  startDate: LocalDate;
  endDate?: LocalDate;
  archivedAt?: number;
}

export interface PatternDayDefinition {
  patternId: string;
  dayIndex: number;
  isRestDay: boolean;
  shiftTypeId?: string;
}

export interface OverrideDefinition {
  date: LocalDate;
  kind: "shift" | "rest" | "extra";
  shiftTypeId?: string;
  intervals?: ShiftInterval[];
}

export interface ResolvedDay {
  date: LocalDate;
  kind: "shift" | "rest";
  source: "override" | "pattern" | "default";
  shiftTypeId?: string;
  intervals: ShiftInterval[];
  startInstant?: number;
  endInstant?: number;
  plannedMinutes: number;
}

export interface EngineInput {
  timezone: string;
  date: LocalDate;
  shiftTypes: Record<string, ShiftTypeDefinition>;
  pattern?: PatternDefinition;
  patternDays?: PatternDayDefinition[];
  override?: OverrideDefinition;
}

export interface EngineRangeInput {
  timezone: string;
  startDate: LocalDate;
  endDate: LocalDate;
  shiftTypes: Record<string, ShiftTypeDefinition>;
  patterns?: PatternDefinition[];
  patternDays?: PatternDayDefinition[];
  overrides?: OverrideDefinition[];
}

export function resolveDay(input: EngineInput): ResolvedDay;
export function resolveRange(input: EngineRangeInput): ResolvedDay[];
```

Reglas del contrato:

- `resolveDay` es determinista y no accede a la base de datos.
- `resolveRange` recorre días de calendario en la zona del usuario y aplica la misma prioridad: excepción, patrón activo y descanso por defecto.
- Si hay varios patrones que cubren una fecha, gana el de `startDate` más reciente; el backend impide solapamientos activos.
- Los patrones archivados se siguen resolviendo si su `endDate` cubre la fecha: archivar no debe borrar el histórico.
- Las queries de Convex cargan los datos y llaman al motor; los turnos se pasan ya indexados por `id`.
- `plannedMinutes` se obtiene de los instantes reales de los intervalos, descontando los descansos no remunerados que caen dentro de la jornada. Así un turno nocturno puede durar 7 o 9 horas en los cambios de horario.
- Los descansos se ubican en el día del turno o en el siguiente si cruzan medianoche.
- El calendario y las estadísticas consumen `ResolvedDay[]`.
- Cualquier cambio de firma debe actualizar este documento y sus pruebas.

## 5.22. Recordatorios (decisión)

- Las preferencias se guardan en `users.reminderSettings`: `enabled`, `leadMinutes` y `notifyChanges`.
- La programación del aviso se hace en el cliente con `setTimeout` a partir del próximo turno resuelto por el motor; el permiso de notificaciones se solicita desde `/settings` con una acción del usuario.
- La notificación se muestra con `registration.showNotification` del service worker y, como respaldo, con `new Notification`.
- **No hay servidor de push en el MVP**: los avisos solo se entregan con la aplicación abierta o instalada en segundo plano. La interfaz lo advierte explícitamente.
- El aviso de cambio de turno se detecta comparando la firma del próximo turno mientras la sesión está abierta.
- Si en el futuro se necesitan notificaciones con la app cerrada, se añadirá Web Push con suscripción, claves VAPID y un endpoint en Convex; no se promete hasta entonces.

## 5.23. Resumen de decisiones cerradas

| #   | Decisión                                                    | Estado  |
| --- | ----------------------------------------------------------- | ------- |
| 1   | Convex Auth con email + contraseña                          | Cerrada |
| 2   | Turnos con `intervals[]` (soporta partidos y nocturnos)     | Cerrada |
| 3   | Calendario calculado al leer; solo excepciones persistidas  | Cerrada |
| 4   | Una única excepción por usuario y fecha                     | Cerrada |
| 5   | Fechas locales `YYYY-MM-DD`, instantes UTC, horas `HH:mm`   | Cerrada |
| 6   | Política DST explícita                                      | Cerrada |
| 7   | PDF en cliente con `@react-pdf/renderer`                    | Cerrada |
| 8   | PWA con Service Worker propio y sin caché de datos privados | Cerrada |
| 9   | MVP solo en español con textos centralizados                | Cerrada |
| 10  | ESLint + Prettier + GitHub Actions                          | Cerrada |
| 11  | Errores con `ConvexError` y códigos estables                | Cerrada |
| 12  | Motor puro con contrato tipado                              | Cerrada |
| 13  | Recordatorios en cliente, sin servidor de push en el MVP    | Cerrada |

---

# 6. Arquitectura general

La arquitectura debe mantener separados los siguientes ámbitos:

```text
┌───────────────────────────────────────────┐
│                USUARIO                     │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│              NEXT.JS 16                    │
│                                           │
│  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Pages     │  │    Components      │ │
│  └─────────────┘  └─────────────────────┘ │
│                                           │
│  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Hooks     │  │    UI / Forms       │ │
│  └─────────────┘  └─────────────────────┘ │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│                 CONVEX                    │
│                                           │
│  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Queries    │  │     Mutations       │ │
│  └─────────────┘  └─────────────────────┘ │
│                                           │
│  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Database   │  │     Validations     │ │
│  └─────────────┘  └─────────────────────┘ │
└───────────────────────────────────────────┘
```

## 6.1. Separación por dominios

Organizar el código por funcionalidades.

Estructura orientativa:

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
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── calendar/
│   ├── shifts/
│   ├── dashboard/
│   └── shared/
│
├── features/
│   ├── shifts/
│   ├── patterns/
│   ├── calendar/
│   ├── time-entries/
│   ├── statistics/
│   └── vacations/
│
├── hooks/
├── lib/
│   ├── dates/
│   ├── calculations/
│   ├── validators/
│   └── utils/
│
├── types/
└── styles/
```

Esta estructura es orientativa. Se podrá ajustar si los agentes encuentran una organización mejor, siempre que se mantenga la separación de responsabilidades.

---

# 7. Modelo de datos (Convex)

El modelo definitivo se implementa con el esquema de Convex, usando validadores `v.*`.

## 7.0. Convenciones de almacenamiento

| Dato                | Tipo     | Formato            | Ejemplo           |
| ------------------- | -------- | ------------------ | ----------------- |
| Fecha de calendario | `string` | `YYYY-MM-DD` local | `"2026-03-29"`    |
| Hora de turno       | `string` | `HH:mm` local      | `"22:00"`         |
| Instante real       | `number` | epoch ms UTC       | `1774764000000`   |
| Zona horaria        | `string` | IANA               | `"Europe/Madrid"` |
| Color               | `string` | hexadecimal        | `"#2563eb"`       |

- No se guardan objetos `Date` en la base de datos.
- Las fechas locales no se convierten a UTC al guardarlas.
- `_creationTime` se usa como fecha de creación; `updatedAt` se añade solo en tablas editables.
- Los catálogos (turnos y patrones) usan borrado lógico con `archivedAt`.

## 7.1. User

Representa al usuario.

Campos conceptuales:

- Nombre.
- Email.
- Zona horaria.
- Configuración regional.
- Fecha de creación.
- Preferencias.

La autenticación se resuelve con **Convex Auth** (ver 5.14). La tabla `users` la define `@convex-dev/auth` y se amplía con los campos de perfil.

## 7.2. ShiftType

Representa un tipo de turno reutilizable.

```ts
shiftTypes: defineTable({
  userId: v.id("users"),
  name: v.string(),
  color: v.string(), // #RRGGBB
  description: v.optional(v.string()),
  intervals: v.array(
    v.object({
      start: v.string(), // HH:mm local
      end: v.string(), // HH:mm local; si end <= start cruza medianoche
    }),
  ),
  breaks: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))), // descansos con hora de inicio y fin
  breakMinutes: v.number(), // suma calculada por el backend
  breakPaid: v.boolean(),
  archivedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_archived", ["userId", "archivedAt"]);
```

Reglas:

- Una jornada partida se modela con varios intervalos. El hueco entre intervalos no cuenta como trabajo.
- `isOvernight` no se almacena: se deriva de si algún intervalo tiene `end <= start`.
- Los descansos se definen con hora de inicio y fin en `breaks`; `breakMinutes` es su suma y la calcula el backend.
- `breakPaid = true` mantiene la pausa dentro de las horas computadas; `false` la descuenta.
- Los turnos en uso no se borran: se archivan con `archivedAt`.

## 7.3. ShiftPattern

Representa un patrón de trabajo.

```ts
shiftPatterns: defineTable({
  userId: v.id("users"),
  name: v.string(),
  type: v.union(v.literal("weekly"), v.literal("rotating")),
  cycleLength: v.number(), // 7 en weekly, n en rotating
  anchorDate: v.string(), // YYYY-MM-DD; lunes en weekly, día 0 en rotating
  startDate: v.string(),
  endDate: v.optional(v.string()),
  archivedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_active", ["userId", "archivedAt"]);
```

Reglas:

- `weekly`: `anchorDate` debe ser lunes y `cycleLength` = 7.
- `rotating`: `anchorDate` es la fecha que corresponde al `dayIndex` 0.
- No puede haber dos patrones activos solapados en fechas para el mismo usuario.
- Un cambio de patrón cierra el anterior con `endDate` o lo archiva; nunca reescribe el historial.
- Archivar fija `endDate` antes de marcar `archivedAt`, para que el histórico siga resolviéndose.

## 7.4. PatternDay

Representa cada posición dentro de un patrón.

```ts
patternDays: defineTable({
  patternId: v.id("shiftPatterns"),
  dayIndex: v.number(), // 0..cycleLength-1
  isRestDay: v.boolean(),
  shiftTypeId: v.optional(v.id("shiftTypes")), // obligatorio si isRestDay = false
})
  .index("by_pattern", ["patternId"])
  .index("by_pattern_day", ["patternId", "dayIndex"]);
```

Reglas:

- `weekly`: `dayIndex` 0 = lunes … 6 = domingo.
- `rotating`: `dayIndex` 0 = `anchorDate`.
- Debe existir exactamente un registro por `(patternId, dayIndex)`.

## 7.5. ScheduleOverride

Sustituye al antiguo `ScheduledShift`. Representa únicamente los días que el usuario modifica respecto al patrón.

```ts
scheduleOverrides: defineTable({
  userId: v.id("users"),
  date: v.string(), // YYYY-MM-DD local
  kind: v.union(
    v.literal("shift"), // cambio de turno u horas
    v.literal("rest"), // día libre no previsto
    v.literal("extra"), // jornada añadida
  ),
  shiftTypeId: v.optional(v.id("shiftTypes")),
  intervals: v.optional(
    v.array(v.object({ start: v.string(), end: v.string() })),
  ),
  notes: v.optional(v.string()),
  updatedAt: v.number(),
}).index("by_user_date", ["userId", "date"]);
```

Reglas:

- Solo puede existir **una** excepción por `(userId, date)`. La mutation rechaza duplicados con `CONFLICT`.
- `intervals` permite cambiar las horas solo para ese día.
- No se almacena `status` ni `source`: `kind` ya expresa el origen lógico.
- No se materializan jornadas sin excepción.

## 7.6. TimeEntry

Representa las horas realmente trabajadas.

```ts
timeEntries: defineTable({
  userId: v.id("users"),
  date: v.string(), // YYYY-MM-DD local al que se imputa
  actualStart: v.optional(v.number()), // epoch ms UTC
  actualEnd: v.optional(v.number()), // epoch ms UTC
  intervals: v.optional(
    v.array(v.object({ start: v.number(), end: v.number() })),
  ),
  breakMinutes: v.number(),
  expectedMinutes: v.optional(v.number()), // snapshot del previsto al registrar
  overtimeIntervals: v.optional(
    v.array(v.object({ start: v.string(), end: v.string() })), // HH:mm local
  ),
  overtimeMinutes: v.optional(v.number()),
  shiftTypeId: v.optional(v.id("shiftTypes")),
  notes: v.optional(v.string()),
  updatedAt: v.number(),
}).index("by_user_date", ["userId", "date"]);
```

Reglas:

- No referencia `ScheduledShift`, porque el calendario es derivado.
- Puede existir sin turno planificado (jornada extra real).
- `actualEnd > actualStart` cuando se registran horas reales.
- `expectedMinutes` se congela para que el histórico no cambie si el patrón se edita después.
- Las horas extra son explícitas: el usuario declara si las hizo, cuántos tramos y en qué horario. El backend calcula `overtimeMinutes` con la zona horaria del usuario.
- La clasificación de horas (normal, extra, festivo, festivo-extra) es derivada al leer, mutuamente excluyente y sin recargos económicos.

## 7.7. Holiday

Representa un festivo.

Campos:

- userId.
- date.
- name.
- scope.

El ámbito puede ser:

- Nacional.
- Autonómico.
- Local.
- Personal.

## 7.8. VacationBalance

Representa el saldo de vacaciones.

Campos:

- userId.
- year.
- allocatedDays.
- usedDays.

El sistema debe permitir ajustar manualmente el saldo.

## 7.9. Índices, integridad y aislamiento

- Toda tabla de datos incluye `userId` e índice de acceso por usuario.
- Las consultas por rango usan `by_user_date` o `by_user_year`.
- Toda mutation valida que las referencias (`shiftTypeId`, `patternId`) pertenecen al usuario autenticado.
- No se permiten registros huérfanos: al archivar un turno o patrón se comprueba su uso.
- El aislamiento se aplica en el backend; los filtros del cliente son solo optimización.
- `userId` nunca se acepta como argumento de una mutation: se obtiene de la identidad.
- El calendario no se materializa: se calcula por rango solicitado (ver 5.15).

---

# 8. Motor de cálculo de turnos

Esta es una de las partes más importantes del proyecto.

El motor debe ser independiente de la interfaz.

Debe poder recibir:

- Un patrón.
- Una fecha de inicio.
- Una fecha de finalización.
- La zona horaria.
- Las excepciones.

Y devolver las jornadas correspondientes.

## 8.1. Prioridad de resolución

Como mucho existe **una** excepción por usuario y fecha (restricción validada al crear), la resolución es determinista:

1. Si existe `scheduleOverrides` para la fecha, se aplica esa excepción.
   - `kind = "rest"`: descanso.
   - `kind = "shift"`: turno con posible cambio de horas.
   - `kind = "extra"`: jornada añadida.
2. Si no hay excepción, se busca el patrón activo que cubra la fecha.
   - Se calcula el `dayIndex` y se consulta `patternDays`.
   - Descanso o turno según el patrón.
3. Si no hay patrón, descanso por defecto.

No existe ambigüedad entre excepción y jornada extraordinaria: la extraordinaria es una excepción de tipo `extra`.

## 8.2. Turnos nocturnos

Ejemplo:

- Entrada: 22:00.
- Salida: 06:00.

La jornada comienza un día y termina al siguiente.

La duración debe ser de 8 horas, salvo pausas u otras particularidades.

No se debe interpretar la salida como una hora anterior dentro del mismo día.

## 8.3. Jornadas partidas

Ejemplo:

- 09:00 a 13:00.
- 16:00 a 20:00.

La jornada debe admitir varios intervalos de trabajo.

No se debe limitar el modelo a una única entrada y salida si se pretende soportar horarios partidos.

## 8.4. Pausas

Distinguir:

- Pausas remuneradas.
- Pausas no remuneradas.

Las horas trabajadas deben calcularse conforme a esta configuración.

## 8.5. Cambios de horario

El motor debe contemplar los cambios de horario de verano e invierno.

No asumir que una jornada de ocho horas locales siempre equivale a ocho horas transcurridas en UTC.

Las fechas y horas deben interpretarse en la zona horaria correspondiente.

## 8.6. Cambios de patrón

Cuando el usuario cambia su patrón a partir de una fecha determinada:

- No modificar jornadas históricas.
- Mantener las excepciones existentes cuando corresponda.
- Aplicar el nuevo patrón desde la fecha seleccionada.
- Evitar generar jornadas duplicadas.
- Informar al usuario de las consecuencias del cambio.

## 8.7. Algoritmo de resolución

```text
resolveDay(date):
  override = overrides.find(userId, date)
  if override exists:
    return buildFromOverride(override)

  pattern = activePatternFor(userId, date)
  if pattern exists:
    index = dayIndexFor(pattern, date)   // ver 8.8
    day = patternDays.find(pattern.id, index)
    if day.isRestDay: return rest(date, "pattern")
    return buildFromPattern(day.shiftTypeId, date, "pattern")

  return rest(date, "default")
```

Reglas:

- `buildFrom*` convierte `HH:mm` locales a instantes con la zona horaria del usuario.
- Todas las fechas intermedias se recorren como días de calendario en la zona del usuario.
- El resultado se cachea solo en memoria del cliente, nunca en la base de datos.

## 8.8. Índice de ciclo

- `weekly`: `dayIndex = (weekday + 6) % 7` con lunes = 0. `anchorDate` debe ser lunes.
- `rotating`: `dayIndex = mod(daysBetweenLocal(anchorDate, date), cycleLength)`.
- `daysBetweenLocal` cuenta días de calendario, no milisegundos, para ignorar DST.

---

# 9. Diseño y experiencia de usuario

La interfaz debe ser moderna, limpia y funcional.

No debe parecer un panel empresarial complejo.

## 9.1. Dashboard

La pantalla principal debe mostrar:

- Próximo turno.
- Hora de entrada.
- Hora de salida.
- Tiempo restante hasta el siguiente turno, si procede.
- Próximo día libre.
- Horas trabajadas este mes.
- Resumen semanal.
- Acceso rápido al calendario.

## 9.2. Calendario

Debe ser la sección más importante de la aplicación.

Características:

- Vista mensual.
- Vista semanal.
- Navegación entre meses.
- Colores por tipo de turno.
- Descansos claramente identificados.
- Indicadores de vacaciones y festivos.
- Edición rápida de jornadas.
- Acceso al detalle de cada turno.

## 9.3. Gestión de turnos

El usuario debe poder:

- Crear.
- Editar.
- Eliminar.
- Duplicar.
- Cambiar colores.
- Consultar duración.

## 9.4. Gestión de patrones

La creación de patrones debe ser visual.

Ejemplo:

| Día | Turno    |
| --- | -------- |
| 1   | Mañana   |
| 2   | Mañana   |
| 3   | Tarde    |
| 4   | Tarde    |
| 5   | Descanso |
| 6   | Descanso |

Debe ser posible duplicar patrones y reutilizarlos.

## 9.5. Diseño responsive

La aplicación debe funcionar correctamente en:

- Ordenadores.
- Tablets.
- Móviles.

En móvil:

- Priorizar el calendario.
- Reducir información secundaria.
- Utilizar menús compactos.
- Facilitar la edición táctil.
- Evitar tablas que requieran desplazamientos horizontales innecesarios.

## 9.6. Accesibilidad

- Contraste suficiente.
- Navegación por teclado.
- Etiquetas accesibles.
- Estados visuales claros.
- No depender exclusivamente del color para distinguir turnos.

---

# 10. Seguridad y privacidad

La seguridad debe implementarse desde el principio.

Requisitos:

- Autenticación.
- Autorización en backend.
- Validación de datos.
- Aislamiento de datos por usuario.
- Protección de operaciones privadas.
- Gestión segura de sesiones.
- No exponer claves privadas.
- No almacenar credenciales en el frontend.
- Evitar registros de información personal innecesaria.

Cada consulta y mutación debe comprobar que el usuario autenticado tiene permiso para acceder al registro.

La interfaz no constituye una barrera de seguridad.

Las reglas de autorización deben estar en Convex.

---

# 11. Historias de usuario

## Gestión de turnos

- Como usuario, quiero crear un turno de mañana para reutilizarlo.
- Como usuario, quiero asignar un color a cada turno.
- Como usuario, quiero editar un turno sin tener que crearlo de nuevo.
- Como usuario, quiero definir turnos nocturnos.

## Patrones

- Como usuario, quiero crear un patrón semanal.
- Como usuario, quiero crear un ciclo rotativo.
- Como usuario, quiero aplicar un patrón desde una fecha concreta.
- Como usuario, quiero cambiar mi patrón sin modificar el historial.

## Calendario

- Como usuario, quiero consultar mis turnos del mes.
- Como usuario, quiero conocer mis próximos días libres.
- Como usuario, quiero modificar una jornada concreta.
- Como usuario, quiero consultar los detalles de cada jornada.

## Registro de horas

- Como usuario, quiero registrar mi hora real de entrada.
- Como usuario, quiero registrar mi hora real de salida.
- Como usuario, quiero comparar las horas previstas con las realizadas.

## Estadísticas

- Como usuario, quiero saber cuántas horas he trabajado este mes.
- Como usuario, quiero consultar las horas acumuladas durante el año.
- Como usuario, quiero conocer mi diferencia entre horas previstas y realizadas.

## Exportación

- Como usuario, quiero exportar mi calendario en PDF.
- Como usuario, quiero descargar mis registros en CSV.

---

# 12. Pruebas y criterios de calidad

Las pruebas deben acompañar al desarrollo.

## 12.1. Pruebas del motor de turnos

Casos obligatorios:

1. Turno de mañana.
2. Turno de tarde.
3. Turno nocturno.
4. Jornada partida.
5. Día de descanso.
6. Ciclo rotativo.
7. Patrón semanal.
8. Excepción manual.
9. Cambio de patrón.
10. Cambio de mes.
11. Cambio de año.
12. Año bisiesto.
13. Cambio de horario de verano.
14. Cambio de horario de invierno.
15. Jornada con pausa.
16. Jornada sin pausa.
17. Excepción de tipo descanso sobre un día de trabajo.
18. Jornada extraordinaria en día de descanso.
19. Rechazo de una segunda excepción en la misma fecha.
20. Resolución sin patrón activo.
21. Cambio de patrón sin afectar al historial.
22. Turno nocturno en cambio de horario de verano.
23. Turno nocturno en cambio de horario de invierno.
24. Patrón semanal con `anchorDate` en lunes.

## 12.2. Pruebas de seguridad

- Un usuario no puede consultar datos de otro.
- Un usuario no puede modificar turnos ajenos.
- Un usuario no puede eliminar registros ajenos.
- Las funciones privadas rechazan usuarios no autenticados.
- Los identificadores enviados por el cliente se validan en backend.

## 12.3. Pruebas de interfaz

- Formularios.
- Validaciones.
- Calendario.
- Navegación.
- Modales.
- Responsive.
- Estados de carga.
- Estados vacíos.
- Mensajes de error.

## 12.4. Pruebas PWA

- Manifest válido.
- Iconos correctos.
- Instalación en navegadores compatibles.
- Carga de recursos estáticos sin conexión.
- Ausencia de exposición de datos privados mediante caché.
- Comportamiento adecuado al recuperar la conexión.

## 12.5. Definición de terminado

Una funcionalidad se considera terminada cuando:

- Está implementada.
- Está integrada.
- Tiene validación.
- Tiene tratamiento de errores.
- Es responsive.
- Tiene pruebas adecuadas.
- Respeta la seguridad.
- No rompe funcionalidades existentes.
- Está documentada cuando corresponde.

---

# 13. Plan de desarrollo por fases

## Fase 1. Preparación

Objetivos:

- Crear el proyecto Next.js.
- Configurar TypeScript.
- Configurar Tailwind CSS v4.
- Instalar shadcn/ui.
- Configurar Convex.
- Configurar autenticación.
- Preparar estructura de carpetas.
- Configurar Vitest y Playwright.

Resultado: proyecto inicial funcional.

## Fase 2. Sistema de turnos

Objetivos:

- Crear tipos de turno.
- Crear formularios.
- Validar datos.
- Implementar operaciones CRUD.
- Crear pruebas.

Resultado: el usuario puede gestionar sus turnos.

## Fase 3. Patrones laborales

Objetivos:

- Crear patrones semanales.
- Crear ciclos rotativos.
- Implementar el motor de cálculo.
- Resolver jornadas por fecha.
- Gestionar cambios de patrón.

Resultado: el usuario puede definir su calendario laboral.

## Fase 4. Calendario

Objetivos:

- Implementar vista mensual.
- Implementar vista semanal.
- Mostrar turnos.
- Mostrar descansos.
- Mostrar excepciones.
- Permitir edición de jornadas.

Resultado: calendario funcional.

## Fase 5. Registro de horas

Objetivos:

- Registrar entradas.
- Registrar salidas.
- Gestionar pausas.
- Calcular horas reales.
- Comparar con horas previstas.

Resultado: control de jornada.

## Fase 6. Dashboard y estadísticas

Objetivos:

- Resumen mensual.
- Resumen anual.
- Gráficos.
- Próximos turnos.
- Próximos descansos.

Resultado: panel de información personal.

## Fase 7. Exportación

Objetivos:

- Exportar PDF.
- Exportar CSV.
- Comprobar legibilidad.
- Comprobar integridad de los datos.

Resultado: información exportable.

## Fase 8. PWA y optimización

Objetivos:

- Manifest.
- Iconos.
- Service Worker.
- Estrategia de caché.
- Instalación.
- Optimización de rendimiento.

Resultado: aplicación instalable.

## Fase 9. Mejoras posteriores

- Vacaciones.
- Festivos.
- Recordatorios.
- Notificaciones.
- Importación de calendarios.
- Mejoras de estadísticas.

---

# 14. Organización de agentes de IA

El proyecto puede desarrollarse mediante varios agentes especializados.

El coordinador será responsable de mantener la coherencia general.

## Agente 1. Coordinador / Arquitecto

Responsabilidades:

- Mantener la arquitectura.
- Definir tareas.
- Revisar decisiones técnicas.
- Evitar duplicidades.
- Coordinar agentes.
- Validar integraciones.
- Mantener documentación.

No debe permitir cambios importantes de arquitectura sin justificación.

## Agente 2. Backend / Convex

Responsabilidades:

- Diseñar el esquema.
- Implementar queries.
- Implementar mutations.
- Gestionar autenticación.
- Validar permisos.
- Implementar operaciones de datos.
- Crear pruebas.

## Agente 3. Motor de fechas y cálculos

Responsabilidades:

- Implementar el motor de patrones.
- Resolver jornadas.
- Calcular horas.
- Gestionar turnos nocturnos.
- Gestionar jornadas partidas.
- Gestionar excepciones.
- Resolver zonas horarias.
- Crear pruebas exhaustivas.

Este agente debe trabajar de forma independiente de la interfaz.

## Agente 4. Frontend / UX

Responsabilidades:

- Crear componentes.
- Implementar calendario.
- Implementar dashboard.
- Crear formularios.
- Adaptar diseño responsive.
- Aplicar sistema visual.
- Integrar Convex.

## Agente 5. QA / Testing

Responsabilidades:

- Crear pruebas unitarias.
- Crear pruebas de integración.
- Crear pruebas E2E.
- Revisar errores.
- Detectar casos límite.
- Comprobar seguridad.
- Validar funcionalidades terminadas.

---

# 15. Reglas de trabajo para los agentes

Todos los agentes deben cumplir estas reglas:

1. Leer el documento antes de comenzar.
2. No cambiar el stack tecnológico sin justificación.
3. No modificar código ajeno a la tarea sin necesidad.
4. No duplicar funcionalidades.
5. No crear componentes innecesariamente complejos.
6. Mantener TypeScript estricto.
7. Evitar `any`.
8. No confiar en validaciones exclusivamente frontend.
9. Crear pruebas para lógica importante.
10. Documentar decisiones relevantes.
11. Mantener compatibilidad entre módulos.
12. Informar de dependencias o bloqueos.
13. No dar por terminada una tarea sin comprobarla.
14. Registrar la sesión de trabajo y el pendiente antes de finalizar (ver 15.4).

## 15.1. Gestión de dependencias

Antes de instalar una librería:

- Comprobar si ya existe una solución.
- Revisar compatibilidad con el stack.
- Justificar la necesidad.
- Evitar dependencias redundantes.

No cambiar una librería principal sin aprobación del coordinador.

## 15.2. Gestión de cambios

Si un agente detecta un problema de arquitectura:

1. Describir el problema.
2. Explicar sus consecuencias.
3. Proponer una solución.
4. Esperar aprobación del coordinador cuando el cambio afecte al diseño general.

## 15.3. Comunicación entre agentes

Cada agente deberá informar:

- Qué ha desarrollado.
- Qué archivos ha modificado.
- Qué dependencias ha añadido.
- Qué pruebas ha ejecutado.
- Qué problemas ha encontrado.
- Qué queda pendiente.

## 15.4. Registro de sesión y traspaso entre agentes

Ninguna sesión se considera cerrada hasta actualizar el registro de sesión. El objetivo es que el siguiente agente sepa qué se hizo, qué se rompió y dónde continuar sin releer todo el historial.

### Ubicación

- Un archivo por sesión en `docs/sessions/YYYY-MM-DD-HHmm-<agente>.md`.
- Un índice acumulativo en `docs/SESSION_LOG.md`, con una línea por sesión: fecha, agente, resumen y enlace.
- Ambos se versionan en git junto al código.

### Plantilla obligatoria

```markdown
# Sesión <fecha> — <agente/modelo>

## Objetivo

...

## Hecho

- [x] ...

## Archivos creados/modificados

- `ruta` — motivo

## Decisiones tomadas

- ...

## Dependencias añadidas

- ...

## Pruebas ejecutadas

- Comando — resultado

## Problemas / bloqueos

- ...

## Pendiente para la siguiente sesión

- [ ] ...
- [ ] ...

## Siguiente paso recomendado

...
```

### Reglas

1. El primer paso de cada sesión es leer la última entrada de `docs/SESSION_LOG.md` y el archivo de sesión más reciente.
2. El último paso de cada sesión es escribir su archivo de sesión y añadir la línea al índice. Si se interrumpe, se anota el estado exacto y el comando para reproducirlo.
3. No se marca una tarea como hecha sin la verificación o prueba indicada.
4. `docs/SESSION_LOG.md` solo se amplía; las correcciones se anotan como entrada nueva, no se reescribe el historial.
5. El registro documenta el trabajo, no las especificaciones. Las decisiones de producto o arquitectura siguen viviendo en `shiftManager.md` y sus documentos derivados.
6. `AGENTS.md` debe repetir esta regla para que cualquier agente la lea antes de empezar.

---

# 16. Diseño visual y marca

Nombre del proyecto: **ShiftManager**.

La identidad visual debe transmitir:

- Organización.
- Claridad.
- Control.
- Productividad.
- Sencillez.

Se recomienda una estética moderna y minimalista.

## 16.1. Paleta inicial orientativa

- Azul principal.
- Azul secundario.
- Fondo neutro.
- Blanco.
- Gris para información secundaria.
- Colores diferenciados para turnos.

Los colores de los turnos deben ser configurables por el usuario.

## 16.2. Tipografía

Utilizar una tipografía sans-serif legible.

## 16.3. Diseño

Evitar:

- Exceso de tarjetas.
- Demasiados colores.
- Animaciones innecesarias.
- Información duplicada.
- Interfaces recargadas.

Priorizar:

- Jerarquía visual.
- Espacios adecuados.
- Navegación sencilla.
- Acciones claras.
- Calendario legible.

---

# 17. Métricas de éxito del MVP

El MVP estará preparado para considerarse funcional cuando un usuario pueda:

1. Registrarse.
2. Iniciar sesión.
3. Crear varios tipos de turno.
4. Crear un patrón semanal.
5. Crear un ciclo rotativo.
6. Aplicar el patrón a un periodo.
7. Consultar el calendario.
8. Modificar una jornada concreta.
9. Registrar las horas reales.
10. Consultar estadísticas.
11. Exportar información.
12. Utilizar la aplicación desde móvil y escritorio.

Además:

- No deben existir errores críticos conocidos en el motor de fechas.
- Los datos deben estar aislados por usuario.
- Las pruebas principales deben pasar.
- El proyecto debe poder desplegarse correctamente.

---

# 18. Primer encargo para el agente coordinador

El primer agente que reciba este documento será el coordinador del proyecto.

Su primera tarea será preparar el entorno y convertir esta especificación en un plan técnico ejecutable.

Debe realizar las siguientes acciones:

### Paso 1. Analizar el documento

Leer todas las especificaciones y detectar posibles ambigüedades.

### Paso 2. Definir arquitectura

Proponer la estructura definitiva del proyecto.

### Paso 3. Definir el modelo de datos

Diseñar el esquema de Convex y sus relaciones.

### Paso 4. Implementar autenticación

Integrar Convex Auth con email + contraseña y OTP, según la decisión 5.14.

### Paso 5. Preparar tareas

Dividir el trabajo en tareas pequeñas, independientes y verificables.

### Paso 6. Priorizar el motor de turnos

Definir los contratos de entrada y salida del motor antes de desarrollar el calendario.

### Paso 7. Preparar documentación

Crear, como mínimo:

- `README.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `DEVELOPMENT_PLAN.md`
- `AGENTS.md`
- `docs/SESSION_LOG.md`
- `docs/sessions/` con la plantilla de sesión (ver 15.4)

### Paso 8. Preparar el entorno

Configurar el proyecto y comprobar que funciona.

No debe intentar desarrollar todas las funcionalidades de una vez.

Debe priorizar una base sólida y verificable.

---

# 19. Decisiones técnicas que deben mantenerse

Salvo que exista una razón técnica importante, se mantendrán estas decisiones:

- Next.js 16.
- TypeScript.
- Convex.
- Convex Auth.
- Tailwind CSS v4.
- shadcn/ui.
- React Hook Form.
- Zod.
- date-fns v4.
- @date-fns/tz.
- React Day Picker.
- Recharts.
- @react-pdf/renderer (solo cliente).
- ESLint + Prettier.
- Vitest.
- Playwright.
- GitHub Actions.
- PWA con Service Worker propio.
- Calendario calculado al leer, no materializado.
- Fechas locales `YYYY-MM-DD` e instantes UTC.

Cualquier modificación debe documentarse y justificarse.

---

# 20. Changelog

## Versión 1.0

- Definición inicial del producto.
- Alcance del MVP.
- Modelo de datos conceptual.
- Arquitectura inicial.
- Organización de agentes.
- Plan de desarrollo.

## Versión 1.1

- Stack tecnológico concretado.
- Incorporación de React Day Picker.
- Incorporación de `@date-fns/tz`.
- Reglas ampliadas de zonas horarias.
- Especificación de PWA.
- Reglas de caché y funcionamiento offline.
- Mejoras en testing.
- Instrucciones de arquitectura para agentes.

## Versión 1.2

- Cerrada la autenticación con Convex Auth (email + contraseña, OTP).
- Turnos remodelados con `intervals[]` para soportar jornadas partidas y nocturnas.
- El calendario deja de materializarse: `ScheduledShift` se sustituye por `scheduleOverrides`.
- Añadida la restricción de una única excepción por usuario y fecha.
- Definida la convención de fechas locales, instantes UTC y horas `HH:mm`.
- Definida la política ante cambios de horario (DST).
- Concretados el patrón semanal y el rotativo (`anchorDate`, `dayIndex`).
- Decidida la exportación en cliente (PDF con `@react-pdf/renderer`, CSV propio).
- Decidida la estrategia PWA sin caché de datos privados.
- Añadidos lint, formato y CI.
- Añadida la internacionalización mínima en español y la convención de errores.
- Añadido el contrato tipado del motor de turnos.
- Añadido resumen de decisiones cerradas y pruebas nuevas.

## Versión 1.3

- Añadido el registro obligatorio de sesión y traspaso entre agentes (15.4).
- Definida la ubicación `docs/sessions/` y el índice `docs/SESSION_LOG.md`.
- Añadida la plantilla de sesión y la regla de leer el último registro antes de empezar.
- Incorporados ambos al listado de documentación mínima.

## Versión 1.4

- Los descansos pasan de minutos sueltos a intervalos con hora de inicio y fin (`breaks`).
- `breakMinutes` se conserva como suma calculada por el backend para no romper el motor.
- Actualizados el esquema, los validadores y la interfaz de gestión de turnos.

## Versión 1.5

- Implementado el motor puro en `src/lib/engine` (`resolveDay` y `resolveRange`).
- Ampliado el contrato de §5.21 con `shiftTypes`, patrones, días de patrón y excepciones tipadas.
- `plannedMinutes` se calcula con instantes reales y descuenta pausas no remuneradas, incluidos nocturnos y DST.

## Versión 1.6

- Añadido el backend Convex de patrones (`list`, `get`, `create`, `update`, `rename`, `archive`) con validación y detección de solapamientos.
- Añadidas las excepciones (`listRange`, `getByDate`, `create`, `update`, `remove`) con rechazo de duplicados por fecha.
- Añadida la query `calendar.getRange`, que carga datos del usuario y llama a `resolveRange`.
- Archivado y edición de patrones definidos para no reescribir el historial.

---

# Fin del documento

**ShiftManager — Una herramienta sencilla para organizar tu vida laboral.**
