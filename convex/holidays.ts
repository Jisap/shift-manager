import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  daysBetweenLocal,
  isValidLocalDate,
} from "../src/lib/dates/local-date";

const holidayScope = v.union(
  v.literal("national"),
  v.literal("regional"),
  v.literal("local"),
  v.literal("personal"),
);

type HolidayScope = "national" | "regional" | "local" | "personal";
type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

const MAX_RANGE_DAYS = 366;
const MAX_NAME_LENGTH = 80;

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
 * Valida que el rango de fechas sea correcto, esté en orden
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

/** Normaliza y valida el nombre del festivo. */
function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `El nombre debe tener entre 1 y ${MAX_NAME_LENGTH} caracteres`,
    });
  }
  return trimmed;
}

/** Devuelve los festivos del usuario en un rango de fechas, ordenados por fecha. */
export const listRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateRange(args.startDate, args.endDate);

    const holidays = await ctx.db
      .query("holidays")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", userId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return holidays.sort((left, right) => left.date.localeCompare(right.date));
  },
});

/**
 * Crea un festivo para una fecha. Se permite más de un festivo por fecha
 * (por ejemplo, nacional y local), pero no duplicar el mismo nombre y ámbito.
 */
export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    scope: holidayScope,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isValidLocalDate(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha no es válida",
      });
    }
    const name = validateName(args.name);

    const sameDate = await ctx.db
      .query("holidays")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    const duplicated = sameDate.some(
      (holiday) => holiday.name === name && holiday.scope === args.scope,
    );
    if (duplicated) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ya existe ese festivo para esa fecha",
      });
    }

    return await ctx.db.insert("holidays", {
      userId,
      date: args.date,
      name,
      scope: args.scope,
    });
  },
});

/** Renombra un festivo o cambia su ámbito. La fecha no se modifica. */
export const update = mutation({
  args: {
    id: v.id("holidays"),
    name: v.string(),
    scope: holidayScope,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Festivo no encontrado",
      });
    }

    await ctx.db.patch(existing._id, {
      name: validateName(args.name),
      scope: args.scope as HolidayScope,
    });
  },
});

/** Elimina un festivo. */
export const remove = mutation({
  args: { id: v.id("holidays") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Festivo no encontrado",
      });
    }
    await ctx.db.delete(existing._id);
  },
});
