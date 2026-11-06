/**
 * Cálculos puros del saldo de vacaciones.
 *
 * El saldo asignado lo introduce el usuario; los días utilizados se derivan de
 * los días de vacaciones registrados. No se asumen convenios ni reglas legales.
 */

export interface VacationBalance {
  allocatedDays: number;
  usedDays: number;
  /** Puede ser negativo si se han registrado más días que los asignados. */
  remainingDays: number;
}

/** Construye el saldo a partir de los días asignados y los utilizados. */
export function buildVacationBalance(
  allocatedDays: number,
  usedDays: number,
): VacationBalance {
  return {
    allocatedDays,
    usedDays,
    remainingDays: allocatedDays - usedDays,
  };
}
