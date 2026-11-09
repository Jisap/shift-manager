import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  addLocalDays,
  daysBetweenLocal,
  isValidLocalDate,
  isValidLocalTime,
} from "../src/lib/dates/local-date";

const intervalFields = v.object({ start: v.string(), end: v.string() });

const overrideFields = {
  kind: v.union(v.literal("shift"), v.literal("rest"), v.literal("extra")),
  shiftTypeId: v.optional(v.id("shiftTypes")),
  intervals: v.optional(v.array(intervalFields)),
  notes: v.optional(v.string()),
};

type OverrideKind = "shift" | "rest" | "extra";

type Interval = { start: string; end: string };

type OverrideInput = {
  kind: OverrideKind;
  shiftTypeId?: Id<"shiftTypes">;
  intervals?: Interval[];
  notes?: string;
};

type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

const MAX_RANGE_DAYS = 366;

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
 * Valida un array de intervalos de trabajo:
 * - Entre 1 y 4 intervalos (soporta partición de jornada, p.ej. turno partido).
 * - Cada intervalo debe tener horas `HH:mm` válidas, y la entrada ≠ salida.
 */
function validateIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0 || intervals.length > 4) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Debe haber entre 1 y 4 intervalos",
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
  return intervals;
}

/**
 * Normaliza las notas opcionales: elimina espacios extremos,
 * devuelve `undefined` si queda vacío y rechaza textos superiores a 500 caracteres.
 */
function validateNotes(notes: string | undefined): string | undefined {
  if (notes === undefined) {
    return undefined;
  }
  const trimmed = notes.trim();
  if (trimmed.length > 500) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Las notas no pueden superar 500 caracteres",
    });
  }
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Verifica que un tipo de turno exista, pertenezca al usuario autenticado
 * y no esté archivado. Devuelve el ID validado.
 */
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

/**
 * Normaliza y valida todos los campos de un override antes de persistirlo:
 * - Los overrides de tipo `rest` solo conservan las notas.
 * - Los de tipo `shift` o `extra` requieren al menos intervalos explícitos o un `shiftTypeId` válido.
 */
async function normalize(
  ctx: DbContext,
  userId: UserId,
  input: OverrideInput,
): Promise<{
  kind: OverrideKind;
  shiftTypeId?: Id<"shiftTypes">;
  intervals?: Interval[];
  notes?: string;
}> {
  const notes = validateNotes(input.notes);

  if (input.kind === "rest") {
    return { kind: "rest", notes };
  }

  const intervals =
    input.intervals === undefined
      ? undefined
      : validateIntervals(input.intervals);
  const shiftTypeId =
    input.shiftTypeId === undefined
      ? undefined
      : await validateShift(ctx, userId, input.shiftTypeId);

  if (intervals === undefined && shiftTypeId === undefined) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Una jornada necesita un turno o sus intervalos",
    });
  }

  return { kind: input.kind, shiftTypeId, intervals, notes };
}

/**
 * Devuelve todas las excepciones del usuario en un rango de fechas dado, ordenadas por fecha.
 */
export const listRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateRange(args.startDate, args.endDate);

    const overrides = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", userId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return overrides.sort((left, right) => left.date.localeCompare(right.date));
  },
});

/**
 * Obtiene la excepción del usuario para una fecha concreta, o `null` si no existe.
 */
export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }
    return await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();
  },
});

/**
 * Crea una excepción para la fecha indicada.
 * Lanza `CONFLICT` si ya existe una excepción para esa fecha (una por usuario y fecha).
 */
export const create = mutation({
  args: { date: v.string(), ...overrideFields },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }

    const existing = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();
    if (existing !== null) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ya existe una excepción para esa fecha",
      });
    }

    const normalized = await normalize(ctx, userId, args);
    return await ctx.db.insert("scheduleOverrides", {
      userId,
      date: args.date,
      kind: normalized.kind,
      shiftTypeId: normalized.shiftTypeId,
      intervals: normalized.intervals,
      notes: normalized.notes,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Actualiza una excepción existente. La fecha no se puede cambiar
 * (usar `remove` + `create` si se necesita cambiar la fecha).
 */
export const update = mutation({
  args: { id: v.id("scheduleOverrides"), ...overrideFields },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Excepción no encontrada",
      });
    }

    const normalized = await normalize(ctx, userId, args);
    await ctx.db.patch(existing._id, {
      kind: normalized.kind,
      shiftTypeId: normalized.shiftTypeId,
      intervals: normalized.intervals,
      notes: normalized.notes,
      updatedAt: Date.now(),
    });
  },
});

/** Elimina permanentemente una excepción. Restaura el día al cálculo de patrón. */
export const remove = mutation({
  args: { id: v.id("scheduleOverrides") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Excepción no encontrada",
      });
    }
    await ctx.db.delete(existing._id);
  },
});

/**
 * Aplica los turnos de un patrón a partir de una fecha objetivo creando o actualizando
 * excepciones (scheduleOverrides) para cada uno de los días del patrón.
 */
export const applyPatternToDate = mutation({
  args: {
    patternId: v.id("shiftPatterns"),
    targetStartDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!isValidLocalDate(args.targetStartDate)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha inicial no es válida",
      });
    }

    const pattern = await ctx.db.get(args.patternId);
    if (pattern === null || pattern.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patrón no encontrado",
      });
    }

    // Obtenemos los días configurados del patrón ordenados por dayIndex
    const patternDays = await ctx.db
      .query("patternDays")
      .withIndex("by_pattern_day", (q) => q.eq("patternId", pattern._id))
      .collect();

    if (patternDays.length === 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El patrón no tiene días configurados",
      });
    }

    patternDays.sort((a, b) => a.dayIndex - b.dayIndex);

    // Para cada día del ciclo, calculamos la fecha e insertamos o actualizamos el override
    const now = Date.now();
    for (const pDay of patternDays) {
      const dayDate = addLocalDays(args.targetStartDate, pDay.dayIndex);

      // Verificamos si ya existe un override para esa fecha
      const existing = await ctx.db
        .query("scheduleOverrides")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", dayDate),
        )
        .unique();

      if (pDay.isRestDay || !pDay.shiftTypeId) {
        // Es día de descanso
        if (existing) {
          await ctx.db.patch(existing._id, {
            kind: "rest",
            shiftTypeId: undefined,
            intervals: undefined,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("scheduleOverrides", {
            userId,
            date: dayDate,
            kind: "rest",
            updatedAt: now,
          });
        }
      } else {
        // Es día de turno con shiftTypeId
        const shift = await ctx.db.get(pDay.shiftTypeId);
        if (!shift || shift.userId !== userId) {
          continue;
        }

        if (existing) {
          await ctx.db.patch(existing._id, {
            kind: "shift",
            shiftTypeId: shift._id,
            intervals: undefined,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("scheduleOverrides", {
            userId,
            date: dayDate,
            kind: "shift",
            shiftTypeId: shift._id,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true, count: patternDays.length };
  },
});
