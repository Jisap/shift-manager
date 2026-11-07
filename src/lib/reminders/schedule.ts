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

  for (const day of input.days) {
    if (day.kind !== "shift") {
      continue;
    }
    const firstInterval = day.intervals[0];
    if (firstInterval === undefined) {
      continue;
    }
    const startInstant = localDateTimeToInstant(
      day.date,
      firstInterval.start,
      input.timezone,
    );
    const reminderAt = startInstant - leadMilliseconds;
    if (reminderAt <= input.now) {
      continue;
    }

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
      signature: `${day.date}|${day.shiftTypeId ?? ""}|${schedule}`,
      title: "Recordatorio de turno",
      body: `${name}${whenLabel(day.date, input.today)}, ${schedule}${
        duration.length > 0 ? ` (${duration})` : ""
      }`,
      tag: `shift-reminder-${day.date}`,
      url: "/calendar",
    };
  }

  return undefined;
}
