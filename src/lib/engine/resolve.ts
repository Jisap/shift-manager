import {
  dayIndexFor,
  enumerateLocalDates,
  localDateTimeToInstant,
  patternCovers,
} from "./dates";
import type {
  EngineInput,
  EngineRangeInput,
  LocalDate,
  OverrideDefinition,
  PatternDayDefinition,
  PatternDefinition,
  ResolvedDay,
  ShiftInterval,
  ShiftTypeDefinition,
} from "./types";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

interface InstantInterval {
  start: number;
  end: number;
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

/**
 * Ordena patrones por fecha de inicio descendente (el más reciente tiene prioridad).
 * En caso de empate, desempata alfabéticamente por su ID.
 */
function byStartDateDescending(
  left: PatternDefinition,
  right: PatternDefinition,
): number {
  if (left.startDate === right.startDate) {
    return left.id.localeCompare(right.id);
  }
  return left.startDate < right.startDate ? 1 : -1;
}

/**
 * Encuentra el patrón no archivado aplicable para una fecha dada.
 * Si varios coinciden, selecciona el que tenga la fecha de inicio más reciente.
 */
function activePatternFor(
  patterns: PatternDefinition[],
  date: LocalDate,
): PatternDefinition | undefined {
  return patterns
    .filter((pattern) => patternCovers(pattern, date))
    .sort(byStartDateDescending)[0];
}

/**
 * Genera el objeto ResolvedDay representativo de un día de descanso sin horas planificadas.
 */
function restDay(date: LocalDate, source: ResolvedDay["source"]): ResolvedDay {
  return {
    date,
    kind: "rest",
    source,
    intervals: [],
    plannedMinutes: 0,
  };
}

/**
 * Convierte un intervalo local (ej. "22:00" a "06:00") a instantes absolutos en epoch ms.
 * Si la hora de fin es menor o igual a la de inicio, asume que cruza medianoche y pasa al día siguiente.
 */
function intervalToInstants(
  date: LocalDate,
  interval: ShiftInterval,
  timezone: string,
  dayOffset: number,
): InstantInterval {
  const start = localDateTimeToInstant(
    date,
    interval.start,
    timezone,
    dayOffset,
  );
  let end = localDateTimeToInstant(date, interval.end, timezone, dayOffset);
  if (end <= start) {
    end = localDateTimeToInstant(date, interval.end, timezone, dayOffset + 1);
  }
  return { start, end };
}

/**
 * Calcula los milisegundos de solapamiento entre dos intervalos de tiempo absolutos.
 */
function overlapMilliseconds(
  left: InstantInterval,
  right: InstantInterval,
): number {
  return Math.max(
    0,
    Math.min(left.end, right.end) - Math.max(left.start, right.start),
  );
}

/**
 * Calcula los minutos de pausas no remuneradas que efectivamente caen dentro
 * de los intervalos de trabajo del turno.
 */
function unpaidBreakMinutes(
  date: LocalDate,
  breaks: ShiftInterval[],
  workSegments: InstantInterval[],
  timezone: string,
): number {
  let total = 0;
  for (const current of breaks) {
    let best = 0;
    for (const dayOffset of [0, 1, -1]) {
      const segment = intervalToInstants(date, current, timezone, dayOffset);
      const overlap = workSegments.reduce(
        (sum, work) => sum + overlapMilliseconds(work, segment),
        0,
      );
      if (overlap > best) {
        best = overlap;
      }
    }
    total += best;
  }
  return total / MILLISECONDS_PER_MINUTE;
}

/**
 * Construye el objeto ResolvedDay para una jornada de trabajo activa:
 * calcula instantes de inicio/fin, minutos brutos y descuenta pausas no remuneradas.
 */
function buildShift(
  date: LocalDate,
  timezone: string,
  source: ResolvedDay["source"],
  intervals: ShiftInterval[],
  shiftType?: ShiftTypeDefinition,
  shiftTypeId?: string,
): ResolvedDay {
  const workSegments = intervals.map((interval) =>
    intervalToInstants(date, interval, timezone, 0),
  );
  if (workSegments.length === 0) {
    throw new EngineError(`La jornada ${date} no tiene intervalos de trabajo`);
  }

  const startInstant = Math.min(
    ...workSegments.map((segment) => segment.start),
  );
  const endInstant = Math.max(...workSegments.map((segment) => segment.end));
  const workedMinutes = workSegments.reduce(
    (sum, segment) => sum + (segment.end - segment.start),
    0,
  );

  const breaks = shiftType?.breaks ?? [];
  const deductedMinutes =
    shiftType?.breakPaid === true
      ? 0
      : unpaidBreakMinutes(date, breaks, workSegments, timezone);

  const resolved: ResolvedDay = {
    date,
    kind: "shift",
    source,
    intervals,
    startInstant,
    endInstant,
    plannedMinutes: Math.max(
      0,
      Math.round(
        (workedMinutes - deductedMinutes * MILLISECONDS_PER_MINUTE) /
          MILLISECONDS_PER_MINUTE,
      ),
    ),
  };
  if (shiftTypeId !== undefined) {
    resolved.shiftTypeId = shiftTypeId;
  }
  return resolved;
}

/**
 * Obtiene los intervalos de trabajo para una excepción.
 * Prioriza los intervalos explícitos del override; si no los hay, usa los del tipo de turno referenciado.
 */
function intervalsForOverride(
  override: OverrideDefinition,
  shiftTypes: Record<string, ShiftTypeDefinition>,
): { intervals: ShiftInterval[]; shiftType?: ShiftTypeDefinition } {
  const shiftType =
    override.shiftTypeId === undefined
      ? undefined
      : shiftTypes[override.shiftTypeId];

  if (override.intervals !== undefined && override.intervals.length > 0) {
    return { intervals: override.intervals, shiftType };
  }

  if (shiftType === undefined || shiftType.intervals.length === 0) {
    throw new EngineError(
      `La excepción del ${override.date} no define intervalos ni un turno válido`,
    );
  }

  return { intervals: shiftType.intervals, shiftType };
}

/**
 * Resuelve una jornada gobernada por una excepción (override),
 * ya sea de descanso forzado o de turno específico/personalizado.
 */
function resolveOverride(
  date: LocalDate,
  timezone: string,
  override: OverrideDefinition,
  shiftTypes: Record<string, ShiftTypeDefinition>,
): ResolvedDay {
  if (override.kind === "rest") {
    return restDay(date, "override");
  }

  const { intervals, shiftType } = intervalsForOverride(override, shiftTypes);
  return buildShift(
    date,
    timezone,
    "override",
    intervals,
    shiftType,
    override.shiftTypeId,
  );
}

/**
 * Resuelve una jornada según la definición del patrón y el índice cíclico del día.
 * Si el patrón no cubre la fecha o marca descanso, devuelve restDay.
 */
function resolvePatternDay(
  date: LocalDate,
  timezone: string,
  pattern: PatternDefinition,
  patternDays: PatternDayDefinition[],
  shiftTypes: Record<string, ShiftTypeDefinition>,
): ResolvedDay {
  if (!patternCovers(pattern, date)) {
    return restDay(date, "default");
  }

  const dayIndex = dayIndexFor(pattern, date);
  const patternDay = patternDays.find(
    (day) => day.patternId === pattern.id && day.dayIndex === dayIndex,
  );

  if (patternDay === undefined || patternDay.isRestDay) {
    return restDay(date, "pattern");
  }

  if (patternDay.shiftTypeId === undefined) {
    throw new EngineError(
      `El día ${dayIndex} del patrón ${pattern.id} no tiene tipo de turno`,
    );
  }

  const shiftType = shiftTypes[patternDay.shiftTypeId];
  if (shiftType === undefined) {
    throw new EngineError(
      `No se encontró el turno ${patternDay.shiftTypeId} del patrón ${pattern.id}`,
    );
  }

  return buildShift(
    date,
    timezone,
    "pattern",
    shiftType.intervals,
    shiftType,
    shiftType.id,
  );
}

/**
 * Resuelve el estado y horarios de un único día según la jerarquía del motor:
 * 1. Excepción (override) si existe.
 * 2. Patrón de turnos activo si cubre la fecha.
 * 3. Descanso por defecto en ausencia de reglas.
 */
export function resolveDay(input: EngineInput): ResolvedDay {
  const { date, timezone, shiftTypes, pattern, patternDays, override } = input;

  if (override !== undefined) {
    return resolveOverride(date, timezone, override, shiftTypes);
  }

  if (pattern !== undefined) {
    return resolvePatternDay(
      date,
      timezone,
      pattern,
      patternDays ?? [],
      shiftTypes,
    );
  }

  return restDay(date, "default");
}

/**
 * Resuelve en memoria todos los días comprendidos en un rango de fechas [startDate, endDate].
 * Itera fecha a fecha aplicando la jerarquía de resolución (excepciones > patrón activo > descanso).
 */
export function resolveRange(input: EngineRangeInput): ResolvedDay[] {
  const {
    timezone,
    startDate,
    endDate,
    shiftTypes,
    patterns = [],
    patternDays = [],
    overrides = [],
  } = input;

  const overridesByDate = new Map(
    overrides.map((override) => [override.date, override]),
  );

  return enumerateLocalDates(startDate, endDate).map((date) => {
    const override = overridesByDate.get(date);
    if (override !== undefined) {
      return resolveOverride(date, timezone, override, shiftTypes);
    }

    const pattern = activePatternFor(patterns, date);
    if (pattern !== undefined) {
      return resolvePatternDay(
        date,
        timezone,
        pattern,
        patternDays,
        shiftTypes,
      );
    }

    return restDay(date, "default");
  });
}
