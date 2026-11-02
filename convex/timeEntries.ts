import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  daysBetweenLocal,
  isValidLocalDate,
  isValidLocalTime,
} from "../src/lib/dates/local-date";
import { localDateTimeToInstant } from "../src/lib/engine";

const localInterval = v.object({ start: v.string(), end: v.string() });

type Interval = { start: string; end: string };
type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

const MAX_RANGE_DAYS = 366;
const MAX_INTERVALS = 4;
const MAX_OVERTIME_MINUTES = 24 * 60;
const MAX_NOTES_LENGTH = 500;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

/**
 * Extrae el userId autenticado del contexto de Convex.
 * Lanza `UNAUTHENTICATED` si no hay sesión activa.
 */
async function requireUserId(ctx: DbContext): Promise<UserId> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Debes iniciar sesión",
    });
  }
  return userId;
}

/** Zona horaria configurada por el usuario, con Madrid como valor por defecto. */
async function userTimezone(ctx: DbContext, userId: UserId): Promise<string> {
  const user = await ctx.db.get(userId);
  return user?.timezone ?? "Europe/Madrid";
}

/** Valida el rango de fechas de una consulta. */
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

/** Normaliza las notas opcionales del registro. */
function validateNotes(notes: string | undefined): string | undefined {
  if (notes === undefined) {
    return undefined;
  }
  const trimmed = notes.trim();
  if (trimmed.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `Las notas no pueden superar ${MAX_NOTES_LENGTH} caracteres`,
    });
  }
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Convierte los tramos locales de horas extra a instantes absolutos,
 * cruzando medianoche cuando el fin es anterior o igual al inicio.
 */
function intervalsToInstants(
  date: string,
  intervals: Interval[],
  timezone: string,
): { start: number; end: number }[] {
  return intervals.map((interval) => {
    const start = localDateTimeToInstant(date, interval.start, timezone);
    let end = localDateTimeToInstant(date, interval.end, timezone);
    if (end <= start) {
      end = localDateTimeToInstant(date, interval.end, timezone, 1);
    }
    return { start, end };
  });
}

/**
 * Valida los tramos de horas extra:
 * - Entre 1 y 4 tramos.
 * - Horas `HH:mm` válidas y entrada distinta de salida.
 * - Sin solapamientos entre tramos del mismo día.
 * - Total no superior a 24 horas.
 */
function validateOvertimeIntervals(
  date: string,
  intervals: Interval[],
  timezone: string,
): number {
  if (intervals.length === 0 || intervals.length > MAX_INTERVALS) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `Debe haber entre 1 y ${MAX_INTERVALS} tramos de horas extra`,
    });
  }

  for (const interval of intervals) {
    if (!isValidLocalTime(interval.start) || !isValidLocalTime(interval.end)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Las horas deben usar el formato HH:mm",
      });
    }
    if (interval.start === interval.end) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La entrada y la salida no pueden coincidir",
      });
    }
  }

  const instants = intervalsToInstants(date, intervals, timezone).sort(
    (left, right) => left.start - right.start,
  );
  for (let index = 1; index < instants.length; index += 1) {
    const previous = instants[index - 1];
    const current = instants[index];
    if (previous !== undefined && current !== undefined && current.start < previous.end) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Los tramos de horas extra no pueden solaparse",
      });
    }
  }

  const totalMinutes = Math.round(
    instants.reduce((total, interval) => total + interval.end - interval.start, 0) /
      MILLISECONDS_PER_MINUTE,
  );
  if (totalMinutes > MAX_OVERTIME_MINUTES) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Las horas extra no pueden superar 24 horas en un día",
    });
  }

  return totalMinutes;
}

/** Valida que el turno referenciado pertenezca al usuario y esté activo. */
async function validateShift(
  ctx: DbContext,
  userId: UserId,
  shiftTypeId: Id<"shiftTypes">,
): Promise<Id<"shiftTypes">> {
  const shift = await ctx.db.get(shiftTypeId);
  if (
    shift === null ||
    shift.userId !== userId ||
    shift.archivedAt !== undefined
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El turno indicado no es válido",
    });
  }
  return shift._id;
}

/** Devuelve los registros de horas del usuario en un rango, ordenados por fecha. */
export const listRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateRange(args.startDate, args.endDate);

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", userId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return entries.sort((left, right) => left.date.localeCompare(right.date));
  },
});

/**
 * Guarda o actualiza las horas extra declaradas para una fecha.
 * El turno planificado se conserva como referencia del día.
 */
export const saveOvertime = mutation({
  args: {
    date: v.string(),
    shiftTypeId: v.optional(v.id("shiftTypes")),
    intervals: v.array(localInterval),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }

    const timezone = await userTimezone(ctx, userId);
    const overtimeMinutes = validateOvertimeIntervals(
      args.date,
      args.intervals,
      timezone,
    );
    const notes = validateNotes(args.notes);
    const shiftTypeId =
      args.shiftTypeId === undefined
        ? undefined
        : await validateShift(ctx, userId, args.shiftTypeId);

    const existing = await ctx.db
      .query("timeEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();

    const payload = {
      shiftTypeId,
      overtimeIntervals: args.intervals,
      overtimeMinutes,
      notes,
      updatedAt: Date.now(),
    };

    if (existing !== null) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("timeEntries", {
      userId,
      date: args.date,
      breakMinutes: 0,
      ...payload,
    });
  },
});

/**
 * Elimina las horas extra declaradas de una fecha. Si el registro solo contenía
 * horas extra, se borra la fila completa; si en el futuro tiene horas reales,
 * solo se limpian los campos de horas extra.
 */
export const removeOvertime = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }

    const existing = await ctx.db
      .query("timeEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();
    if (existing === null) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No hay horas extra para esa fecha",
      });
    }

    if (existing.actualStart === undefined && existing.actualEnd === undefined) {
      await ctx.db.delete(existing._id);
      return;
    }

    await ctx.db.patch(existing._id, {
      overtimeIntervals: undefined,
      overtimeMinutes: undefined,
      updatedAt: Date.now(),
    });
  },
});
