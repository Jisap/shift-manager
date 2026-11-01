import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  resolveRange,
  type OverrideDefinition,
  type PatternDayDefinition,
  type PatternDefinition,
  type ShiftTypeDefinition,
} from "../src/lib/engine";
import { query } from "./_generated/server";
import {
  daysBetweenLocal,
  isValidLocalDate,
} from "../src/lib/dates/local-date";

const DEFAULT_TIMEZONE = "Europe/Madrid";
const MAX_RANGE_DAYS = 366;

/**
 * Comprueba que el string de zona horaria sea válido usando la API `Intl`.
 * Si el valor es inválido o `undefined`, devuelve el timezone por defecto.
 */
function safeTimezone(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_TIMEZONE;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Valida que el rango de fechas sea sintácticamente correcto, esté en orden
 * y no supere el máximo permitido de 366 días.
 */
function validateRange(startDate: string, endDate: string): void {
  if (!isValidLocalDate(startDate) || !isValidLocalDate(endDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El rango de fechas no es válido",
    });
  }
  if (endDate < startDate) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha final no puede ser anterior a la inicial",
    });
  }
  if (daysBetweenLocal(startDate, endDate) > MAX_RANGE_DAYS) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `El rango no puede superar ${MAX_RANGE_DAYS} días`,
    });
  }
}

/**
 * Resuelve y devuelve el calendario del usuario para un rango de fechas.
 *
 * Proceso:
 * 1. Autentica al usuario.
 * 2. Valida el rango (formato, orden y límite de 366 días).
 * 3. Carga en paralelo: perfil del usuario, tipos de turno, patrones y excepciones del rango.
 * 4. Carga los días de cada patrón en paralelo.
 * 5. Convierte los documentos de Convex a las interfaces tipadas del motor puro.
 * 6. Llama a `resolveRange` del motor para calcular cada día según la jerarquía
 *    (override > patrón activo > descanso).
 * 7. Retorna el array de días resueltos junto con el timezone y los límites del rango.
 */
export const getRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Debes iniciar sesión",
      });
    }
    validateRange(args.startDate, args.endDate);

    const [user, shiftDocs, patternDocs, overrideDocs] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query("shiftTypes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("shiftPatterns")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("scheduleOverrides")
        .withIndex("by_user_date", (q) =>
          q
            .eq("userId", userId)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .collect(),
    ]);

    const patternDayDocs = await Promise.all(
      patternDocs.map((pattern) =>
        ctx.db
          .query("patternDays")
          .withIndex("by_pattern", (q) => q.eq("patternId", pattern._id))
          .collect(),
      ),
    );

    // Construir mapa id → ShiftTypeDefinition para el motor
    const shiftTypes: Record<string, ShiftTypeDefinition> = {};
    for (const shift of shiftDocs) {
      shiftTypes[shift._id] = {
        id: shift._id,
        intervals: shift.intervals,
        breaks: shift.breaks,
        breakPaid: shift.breakPaid,
      };
    }

    const patterns: PatternDefinition[] = patternDocs.map((pattern) => ({
      id: pattern._id,
      type: pattern.type,
      cycleLength: pattern.cycleLength,
      anchorDate: pattern.anchorDate,
      startDate: pattern.startDate,
      endDate: pattern.endDate,
      archivedAt: pattern.archivedAt,
    }));

    // Aplanar los días de todos los patrones en un único array
    const patternDays: PatternDayDefinition[] = patternDayDocs
      .flat()
      .map((day) => ({
        patternId: day.patternId,
        dayIndex: day.dayIndex,
        isRestDay: day.isRestDay,
        shiftTypeId: day.shiftTypeId,
      }));

    const overrides: OverrideDefinition[] = overrideDocs.map((override) => ({
      date: override.date,
      kind: override.kind,
      shiftTypeId: override.shiftTypeId,
      intervals: override.intervals,
    }));

    const timezone = safeTimezone(user?.timezone);
    const days = resolveRange({
      timezone,
      startDate: args.startDate,
      endDate: args.endDate,
      shiftTypes,
      patterns,
      patternDays,
      overrides,
    });

    return {
      timezone,
      startDate: args.startDate,
      endDate: args.endDate,
      days,
    };
  },
});
