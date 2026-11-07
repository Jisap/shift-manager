/**
 * Cálculo puro del próximo recordatorio de turno.
 *
 * Recibe los días ya resueltos por el motor y devuelve el primer turno cuyo
 * aviso aún no ha pasado y los datos necesarios para programar la
 * notificación. No accede a Convex ni al DOM.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { daysBetweenLocal, localDateTimeToInstant } from "../engine";
import type { ResolvedDay } from "../engine";
import { formatHours } from "../calculations/overtime";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

/** Resultado del cálculo: todo lo necesario para programar y mostrar el aviso. */
export interface ShiftReminderPlan {
  /** Instante absoluto en el que debe mostrarse la notificación. */
  reminderAt: number;
  /** Fecha local del turno. */
  shiftDate: string;
  /** Identidad estable del turno, para detectar cambios. */
  signature: string;
  title: string;
  body: string;
  tag: string;
  url: string;
}

export interface BuildReminderInput {
  days: ResolvedDay[];
  timezone: string;
  leadMinutes: number;
  /** Instante actual (epoch ms). Se inyecta para poder probar la función. */
  now: number;
  /** Fecha local de hoy, para redactar "hoy" o "mañana". */
  today: string;
  /** Nombres de turno indexados por id, si se conocen. */
  shiftNames?: ReadonlyMap<string, string>;
}

/** Etiqueta temporal relativa del turno: "hoy", "mañana" o su fecha. */
function whenLabel(shiftDate: string, today: string): string {
  const days = daysBetweenLocal(today, shiftDate);
  if (days === 0) {
    return "hoy";
  }
  if (days === 1) {
    return "mañana";
  }
  return `el ${format(parseISO(shiftDate), "d 'de' MMMM", { locale: es })}`;
}

/** Horario legible de un turno: "08:00–16:00 · 17:00–19:00". */
function intervalsLabel(day: ResolvedDay): string {
  return day.intervals
    .map((interval) => `${interval.start}–${interval.end}`)
    .join(" · ");
}

/**
 * Devuelve el próximo aviso de turno. Recorre los días en orden y se queda con
 * el primer turno cuyo instante de aviso (`inicio - antelación`) sea futuro.
 * Los días sin horario o de descanso se ignoran.
 */
export function buildShiftReminder(
  input: BuildReminderInput,
): ShiftReminderPlan | undefined {
  const leadMilliseconds = input.leadMinutes * MILLISECONDS_PER_MINUTE;

  // Se asume que `days` viene ordenado por fecha: el primer turno que cumpla
  // las condiciones es el que se devuelve.
  for (const day of input.days) {
    // Los descansos no generan aviso.
    if (day.kind !== "shift") {
      continue;
    }
    // El aviso se calcula respecto al INICIO del primer tramo del día; un
    // turno partido tiene un único aviso, el del primer tramo. Sin tramos no
    // hay hora de inicio, así que se ignora.
    const firstInterval = day.intervals[0];
    if (firstInterval === undefined) {
      continue;
    }
    // Hora local de inicio convertida a instante absoluto con la zona horaria
    // del calendario (así se respeta el horario de verano).
    const startInstant = localDateTimeToInstant(
      day.date,
      firstInterval.start,
      input.timezone,
    );
    // Momento del aviso: el inicio menos la antelación. Si ya pasó, este turno
    // se salta y se busca el siguiente (no se avisa con retraso).
    const reminderAt = startInstant - leadMilliseconds;
    if (reminderAt <= input.now) {
      continue;
    }

    // Nombre del turno para el mensaje; se omite si no se conoce o está vacío.
    const shiftName =
      day.shiftTypeId === undefined
        ? undefined
        : input.shiftNames?.get(day.shiftTypeId);
    const name =
      shiftName !== undefined && shiftName.length > 0 ? `${shiftName} · ` : "";
    const schedule = intervalsLabel(day);
    const duration = formatHours(day.plannedMinutes);

    return {
      reminderAt,
      shiftDate: day.date,
      // La firma identifica el turno por fecha, tipo y horario: si alguno
      // cambia, se considera que el turno ha cambiado.
      signature: `${day.date}|${day.shiftTypeId ?? ""}|${schedule}`,
      title: "Recordatorio de turno",
      // Ejemplo: "Noche · mañana, 22:00–06:00 (8 h)" (nombre del turno, día,
      // horario y duración). El nombre y el paréntesis con la duración solo
      // se añaden si hay texto.
      body: `${name}${whenLabel(day.date, input.today)}, ${schedule}${duration.length > 0 ? ` (${duration})` : ""
        }`,
      // Etiqueta por fecha: una notificación nueva del mismo día sustituye a
      // la anterior en lugar de apilarse.
      tag: `shift-reminder-${day.date}`,
      // Al pulsar la notificación se abre el calendario.
      url: "/calendar",
    };
  }

  // Ningún turno con aviso pendiente en el rango recibido.
  return undefined;
}
