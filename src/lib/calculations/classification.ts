/**
 * Clasificación de los minutos trabajados en cuatro categorías mutuamente
 * excluyentes. No se aplican recargos económicos: solo se cuentan minutos.
 *
 * - `normal`: trabajo real en un día laborable sin horas extra declaradas.
 * - `extra`: horas extra declaradas (o toda la jornada si la excepción es `extra`).
 * - `holiday`: trabajo real en festivo sin horas extra declaradas.
 * - `holidayExtra`: horas extra declaradas en festivo.
 */
export type ClassifiedMinutes = {
  normal: number;
  extra: number;
  holiday: number;
  holidayExtra: number;
  total: number;
};

export type DayClassificationInput = {
  actualMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  isExtraDay: boolean;
};

export function emptyClassifiedMinutes(): ClassifiedMinutes {
  return {
    normal: 0,
    extra: 0,
    holiday: 0,
    holidayExtra: 0,
    total: 0,
  };
}

/**
 * Clasifica los minutos de un día.
 *
 * Si la jornada está marcada como extra (`scheduleOverrides.kind === "extra"`),
 * todos los minutos reales se consideran extra o festivo-extra. En el resto de
 * días, las horas extra declaradas se descuentan de las reales para no contarlas
 * dos veces. Cuando no hay registro real, las horas extra declaradas cuentan por
 * sí mismas. Las horas extra nunca superan los minutos reales del día.
 */
export function classifyDayMinutes(
  input: DayClassificationInput,
): ClassifiedMinutes {
  const actual = Math.max(0, input.actualMinutes);
  const overtime = Math.max(0, input.overtimeMinutes);
  const result = emptyClassifiedMinutes();

  if (input.isExtraDay) {
    const extraMinutes = actual > 0 ? actual : overtime;
    if (input.isHoliday) {
      result.holidayExtra = extraMinutes;
    } else {
      result.extra = extraMinutes;
    }
    result.total = extraMinutes;
    return result;
  }

  const countedOvertime = actual > 0 ? Math.min(overtime, actual) : overtime;
  const baseMinutes = Math.max(0, actual - countedOvertime);

  if (input.isHoliday) {
    result.holiday = baseMinutes;
    result.holidayExtra = countedOvertime;
  } else {
    result.normal = baseMinutes;
    result.extra = countedOvertime;
  }
  result.total = baseMinutes + countedOvertime;
  return result;
}

/** Suma varios resultados de clasificación en uno solo. */
export function sumClassifiedMinutes(
  items: ClassifiedMinutes[],
): ClassifiedMinutes {
  return items.reduce((total, item) => {
    total.normal += item.normal;
    total.extra += item.extra;
    total.holiday += item.holiday;
    total.holidayExtra += item.holidayExtra;
    total.total += item.total;
    return total;
  }, emptyClassifiedMinutes());
}
