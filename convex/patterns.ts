import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  isValidLocalDate,
  rangesOverlap,
  addLocalDays,
  todayInTimezone,
  weekdayOf,
} from "../src/lib/dates/local-date";

const patternType = v.union(v.literal("weekly"), v.literal("rotating"));

const patternDayFields = v.object({
  dayIndex: v.number(),
  isRestDay: v.boolean(),
  shiftTypeId: v.optional(v.id("shiftTypes")),
});

const patternFields = {
  name: v.string(),
  type: patternType,
  cycleLength: v.number(),
  anchorDate: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
};

type PatternType = "weekly" | "rotating";

type PatternDayInput = {
  dayIndex: number;
  isRestDay: boolean;
  shiftTypeId?: Id<"shiftTypes">;
};

type PatternInput = {
  name: string;
  type: PatternType;
  cycleLength: number;
  anchorDate: string;
  startDate: string;
  endDate?: string;
  days: PatternDayInput[];
};

type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

const MAX_CYCLE_LENGTH = 365;

/**
 * Extrae el userId autenticado del contexto de Convex.
 * Lanza `UNAUTHENTICATED` si no hay sesión activa.
 */
async function requireUserId(ctx: DbContext) {
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
 * Obtiene la zona horaria configurada del usuario,
 * con `Europe/Madrid` como valor por defecto si no la ha establecido.
 */
async function userTimezone(ctx: DbContext, userId: UserId): Promise<string> {
  const user = await ctx.db.get(userId);
  return user?.timezone ?? "Europe/Madrid";
}

/**
 * Valida y normaliza el nombre del patrón: elimina espacios extremos
 * y comprueba que tenga entre 1 y 60 caracteres.
 */
function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 60) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El nombre debe tener entre 1 y 60 caracteres",
    });
  }
  return trimmed;
}

/**
 * Valida todos los campos de un patrón de turnos antes de persistirlo:
 * - Nombre entre 1 y 60 caracteres.
 * - `cycleLength` entero; exactamente 7 para semanales; 1-365 para rotativos.
 * - Fechas válidas en formato `YYYY-MM-DD` y `endDate >= startDate` si se proporciona.
 * - Para patrones semanales, `anchorDate` debe caer en lunes.
 * - El array `days` debe tener exactamente `cycleLength` entradas con índices únicos y sin huecos.
 * - Los días no festivos deben tener `shiftTypeId`.
 */
function validatePattern(input: PatternInput): {
  name: string;
  cycleLength: number;
  anchorDate: string;
  startDate: string;
  endDate: string | undefined;
} {
  const name = validateName(input.name);

  if (!Number.isInteger(input.cycleLength)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La duración del ciclo debe ser un número entero",
    });
  }

  if (input.type === "weekly") {
    if (input.cycleLength !== 7) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Un patrón semanal debe durar 7 días",
      });
    }
  } else if (input.cycleLength < 1 || input.cycleLength > MAX_CYCLE_LENGTH) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `El ciclo debe durar entre 1 y ${MAX_CYCLE_LENGTH} días`,
    });
  }

  if (!isValidLocalDate(input.anchorDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha de anclaje no es válida",
    });
  }

  if (input.type === "weekly" && weekdayOf(input.anchorDate) !== 1) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha de anclaje de un patrón semanal debe ser lunes",
    });
  }

  if (!isValidLocalDate(input.startDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha de inicio no es válida",
    });
  }

  if (input.endDate !== undefined) {
    if (!isValidLocalDate(input.endDate)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha de fin no es válida",
      });
    }
    if (input.endDate < input.startDate) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha de fin no puede ser anterior al inicio",
      });
    }
  }

  if (input.days.length !== input.cycleLength) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Debe haber exactamente un día por cada posición del ciclo",
    });
  }

  const seen = new Set<number>();
  for (const day of input.days) {
    if (
      !Number.isInteger(day.dayIndex) ||
      day.dayIndex < 0 ||
      day.dayIndex >= input.cycleLength
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Hay un día fuera del ciclo",
      });
    }
    if (seen.has(day.dayIndex)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Hay posiciones de ciclo duplicadas",
      });
    }
    seen.add(day.dayIndex);
    if (!day.isRestDay && day.shiftTypeId === undefined) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Cada día de trabajo necesita un tipo de turno",
      });
    }
  }

  return {
    name,
    cycleLength: input.cycleLength,
    anchorDate: input.anchorDate,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

/**
 * Verifica que todos los `shiftTypeId` referenciados en los días del patrón
 * existan en la base de datos, pertenezcan al usuario autenticado y no estén archivados.
 * Devuelve los días normalizados (sin `shiftTypeId` en días de descanso).
 */
async function validateShiftOwnership(
  ctx: DbContext,
  userId: UserId,
  days: PatternDayInput[],
): Promise<PatternDayInput[]> {
  const ids = [
    ...new Set(
      days
        .filter((day) => !day.isRestDay && day.shiftTypeId !== undefined)
        .map((day) => day.shiftTypeId as Id<"shiftTypes">),
    ),
  ];

  const shifts = await Promise.all(ids.map((id) => ctx.db.get(id)));

  const valid = new Set<Id<"shiftTypes">>();
  for (const shift of shifts) {
    if (
      shift !== null &&
      shift.userId === userId &&
      shift.archivedAt === undefined
    ) {
      valid.add(shift._id);
    }
  }

  return days.map((day) => {
    if (day.isRestDay) {
      return { dayIndex: day.dayIndex, isRestDay: true };
    }
    if (day.shiftTypeId === undefined || !valid.has(day.shiftTypeId)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Hay un día con un turno no válido",
      });
    }
    return {
      dayIndex: day.dayIndex,
      isRestDay: false,
      shiftTypeId: day.shiftTypeId,
    };
  });
}

/**
 * Comprueba que ningún patrón activo del usuario se solape con el rango de fechas propuesto.
 * Se puede excluir un patrón de la comprobación mediante `ignoreId` (usado en las actualizaciones
 * para que el propio patrón no colisione consigo mismo).
 * Lanza `CONFLICT` si se detecta solapamiento.
 */
async function assertNoOverlap(
  ctx: DbContext,
  userId: UserId,
  startDate: string,
  endDate: string | undefined,
  ignoreId?: Id<"shiftPatterns">,
): Promise<void> {
  const patterns = await ctx.db
    .query("shiftPatterns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const existing of patterns) {
    if (existing._id === ignoreId) {
      continue;
    }
    if (
      rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)
    ) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ya existe un patrón activo que se solapa con esas fechas",
      });
    }
  }
}

/**
 * Carga todos los días (`patternDays`) de un patrón concreto, ordenados por `dayIndex`.
 * Omite el campo `shiftTypeId` de los documentos que no lo tienen.
 */
async function loadPatternDays(
  ctx: DbContext,
  patternId: Id<"shiftPatterns">,
): Promise<PatternDayInput[]> {
  const days = await ctx.db
    .query("patternDays")
    .withIndex("by_pattern", (q) => q.eq("patternId", patternId))
    .collect();
  return days
    .sort((left, right) => left.dayIndex - right.dayIndex)
    .map((day) => ({
      dayIndex: day.dayIndex,
      isRestDay: day.isRestDay,
      ...(day.shiftTypeId !== undefined
        ? { shiftTypeId: day.shiftTypeId }
        : {}),
    }));
}

/** Devuelve todos los patrones no archivados del usuario, incluyendo sus días. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const patterns = await ctx.db
      .query("shiftPatterns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return await Promise.all(
      patterns
        .filter((pattern) => pattern.archivedAt === undefined)
        .map(async (pattern) => ({
          ...pattern,
          days: await loadPatternDays(ctx, pattern._id),
        })),
    );
  },
});

/** Obtiene un patrón por ID junto con sus días. Lanza `NOT_FOUND` si no pertenece al usuario. */
export const get = query({
  args: { id: v.id("shiftPatterns") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const pattern = await ctx.db.get(args.id);
    if (pattern === null || pattern.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patrón no encontrado",
      });
    }
    return {
      ...pattern,
      days: await loadPatternDays(ctx, pattern._id),
    };
  },
});

/**
 * Crea un nuevo patrón de turnos con sus días de ciclo.
 * Pasos: validar campos → verificar propiedad de los turnos → comprobar solapamiento → persistir.
 */
export const create = mutation({
  args: { ...patternFields, days: v.array(patternDayFields) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const normalized = validatePattern(args);
    const days = await validateShiftOwnership(ctx, userId, args.days);
    await assertNoOverlap(
      ctx,
      userId,
      normalized.startDate,
      normalized.endDate,
    );

    const patternId = await ctx.db.insert("shiftPatterns", {
      userId,
      name: normalized.name,
      type: args.type,
      cycleLength: normalized.cycleLength,
      anchorDate: normalized.anchorDate,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      updatedAt: Date.now(),
    });

    for (const day of days) {
      await ctx.db.insert("patternDays", {
        patternId,
        dayIndex: day.dayIndex,
        isRestDay: day.isRestDay,
        shiftTypeId: day.shiftTypeId,
      });
    }

    return patternId;
  },
});

/**
 * Actualiza un patrón existente que aún no ha comenzado (preserva el histórico).
 * Rechaza con `CONFLICT` si `startDate <= hoy`, ya que reescribiría días ya resueltos.
 * Elimina los días existentes y los reinserta con la nueva definición del ciclo.
 */
export const update = mutation({
  args: {
    id: v.id("shiftPatterns"),
    ...patternFields,
    days: v.array(patternDayFields),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patrón no encontrado",
      });
    }

    const timezone = await userTimezone(ctx, userId);
    const today = todayInTimezone(timezone);
    if (existing.startDate <= today) {
      throw new ConvexError({
        code: "CONFLICT",
        message:
          "Solo se pueden editar patrones que aún no han comenzado; crea uno nuevo para no reescribir el historial",
      });
    }

    const normalized = validatePattern(args);
    if (normalized.startDate <= today) {
      throw new ConvexError({
        code: "CONFLICT",
        message:
          "La nueva fecha de inicio debe ser futura para no reescribir el historial",
      });
    }
    const days = await validateShiftOwnership(ctx, userId, args.days);
    await assertNoOverlap(
      ctx,
      userId,
      normalized.startDate,
      normalized.endDate,
      existing._id,
    );

    await ctx.db.patch(existing._id, {
      name: normalized.name,
      type: args.type,
      cycleLength: normalized.cycleLength,
      anchorDate: normalized.anchorDate,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      updatedAt: Date.now(),
    });

    const currentDays = await ctx.db
      .query("patternDays")
      .withIndex("by_pattern", (q) => q.eq("patternId", existing._id))
      .collect();
    for (const day of currentDays) {
      await ctx.db.delete(day._id);
    }
    for (const day of days) {
      await ctx.db.insert("patternDays", {
        patternId: existing._id,
        dayIndex: day.dayIndex,
        isRestDay: day.isRestDay,
        shiftTypeId: day.shiftTypeId,
      });
    }
  },
});

/**
 * Renombra un patrón sin modificar sus fechas ni su ciclo.
 * Operación ligera que no afecta al histórico.
 */
export const rename = mutation({
  args: { id: v.id("shiftPatterns"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patrón no encontrado",
      });
    }
    await ctx.db.patch(existing._id, {
      name: validateName(args.name),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Archiva (cierra) un patrón sin eliminarlo, para conservar el histórico.
 * - Si se proporciona `closeDate`, el patrón termina en esa fecha.
 * - Si no se proporciona, cierra en la fecha de hoy (o en el día anterior a `startDate`
 *   si el patrón aún no ha comenzado).
 * - Si `closeDate` supera el `endDate` definido del patrón, prevalece el `endDate`.
 * - Idempotente: si ya está archivado, no hace nada.
 */
export const archive = mutation({
  args: { id: v.id("shiftPatterns"), closeDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Patrón no encontrado",
      });
    }
    if (existing.archivedAt !== undefined) {
      return;
    }

    let closeDate: string;
    if (args.closeDate !== undefined) {
      if (!isValidLocalDate(args.closeDate)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "La fecha de cierre no es válida",
        });
      }
      if (args.closeDate < existing.startDate) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "La fecha de cierre no puede ser anterior al inicio",
        });
      }
      closeDate = args.closeDate;
    } else {
      const timezone = await userTimezone(ctx, userId);
      const today = todayInTimezone(timezone);
      closeDate =
        today >= existing.startDate
          ? today
          : addLocalDays(existing.startDate, -1);
    }

    if (existing.endDate !== undefined && existing.endDate < closeDate) {
      closeDate = existing.endDate;
    }

    await ctx.db.patch(existing._id, {
      endDate: closeDate,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
