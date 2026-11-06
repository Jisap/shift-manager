import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { buildVacationBalance } from "../src/lib/calculations/vacations";
import { isValidLocalDate } from "../src/lib/dates/local-date";

const MIN_YEAR = 1970;
const MAX_YEAR = 2100;
const MAX_ALLOCATED_DAYS = 366;
const MAX_NOTE_LENGTH = 500;

type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

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

/** Valida que el año sea un entero dentro del rango admitido. */
function validateYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}`,
    });
  }
}

/** Primer y último día local del año indicado. */
function yearRange(year: number): { startDate: string; endDate: string } {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

/** Normaliza la nota opcional de un día de vacaciones. */
function validateNote(note: string | undefined): string | undefined {
  if (note === undefined) {
    return undefined;
  }
  const trimmed = note.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres`,
    });
  }
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Cuenta los días de vacaciones registrados en un año. */
async function countVacationDays(
  ctx: DbContext,
  userId: UserId,
  year: number,
): Promise<number> {
  const { startDate, endDate } = yearRange(year);
  const days = await ctx.db
    .query("vacations")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).gte("date", startDate).lte("date", endDate),
    )
    .collect();
  return days.length;
}

/**
 * Mantiene sincronizado el contador `usedDays` del saldo anual, si existe.
 * La fuente de verdad siguen siendo los días registrados: `getBalance` vuelve
 * a contar en cada consulta.
 */
async function syncUsedDays(
  ctx: MutationCtx,
  userId: UserId,
  year: number,
): Promise<void> {
  const balance = await ctx.db
    .query("vacationBalances")
    .withIndex("by_user_year", (q) => q.eq("userId", userId).eq("year", year))
    .unique();
  if (balance !== null) {
    await ctx.db.patch(balance._id, {
      usedDays: await countVacationDays(ctx, userId, year),
    });
  }
}

/** Días de vacaciones del usuario en un año, ordenados por fecha. */
export const listYear = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateYear(args.year);
    const { startDate, endDate } = yearRange(args.year);
    const days = await ctx.db
      .query("vacations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", startDate).lte("date", endDate),
      )
      .collect();
    return days.sort((left, right) => left.date.localeCompare(right.date));
  },
});

/** Saldo del año: asignado por el usuario, utilizado y disponible. */
export const getBalance = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateYear(args.year);
    const balance = await ctx.db
      .query("vacationBalances")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", args.year),
      )
      .unique();
    const usedDays = await countVacationDays(ctx, userId, args.year);
    return {
      year: args.year,
      ...buildVacationBalance(balance?.allocatedDays ?? 0, usedDays),
    };
  },
});

/** Define o ajusta manualmente los días asignados en un año. */
export const setAllocatedDays = mutation({
  args: { year: v.number(), allocatedDays: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateYear(args.year);
    if (
      !Number.isInteger(args.allocatedDays) ||
      args.allocatedDays < 0 ||
      args.allocatedDays > MAX_ALLOCATED_DAYS
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Los días asignados deben ser un entero entre 0 y ${MAX_ALLOCATED_DAYS}`,
      });
    }

    const usedDays = await countVacationDays(ctx, userId, args.year);
    const existing = await ctx.db
      .query("vacationBalances")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", args.year),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("vacationBalances", {
        userId,
        year: args.year,
        allocatedDays: args.allocatedDays,
        usedDays,
      });
    } else {
      await ctx.db.patch(existing._id, {
        allocatedDays: args.allocatedDays,
        usedDays,
      });
    }

    return buildVacationBalance(args.allocatedDays, usedDays);
  },
});

/** Registra un día de vacaciones. Solo se permite uno por usuario y fecha. */
export const create = mutation({
  args: { date: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }
    const year = Number(args.date.slice(0, 4));
    validateYear(year);
    const note = validateNote(args.note);

    const existing = await ctx.db
      .query("vacations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();
    if (existing !== null) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ya hay vacaciones registradas para esa fecha",
      });
    }

    const id = await ctx.db.insert("vacations", {
      userId,
      date: args.date,
      note,
      updatedAt: Date.now(),
    });
    await syncUsedDays(ctx, userId, year);
    return id;
  },
});

/** Actualiza la nota de un día de vacaciones. La fecha no cambia. */
export const updateNote = mutation({
  args: { id: v.id("vacations"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Día de vacaciones no encontrado",
      });
    }
    await ctx.db.patch(existing._id, {
      note: validateNote(args.note),
      updatedAt: Date.now(),
    });
  },
});

/** Elimina un día de vacaciones. */
export const remove = mutation({
  args: { id: v.id("vacations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Día de vacaciones no encontrado",
      });
    }
    await ctx.db.delete(existing._id);
    await syncUsedDays(ctx, userId, Number(existing.date.slice(0, 4)));
  },
});
