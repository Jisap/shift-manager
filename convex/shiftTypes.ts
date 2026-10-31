import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;

const shiftFields = {
  name: v.string(),
  color: v.string(),
  description: v.optional(v.string()),
  intervals: v.array(v.object({ start: v.string(), end: v.string() })),
  breaks: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
  breakMinutes: v.number(),
  breakPaid: v.boolean(),
};

type ShiftFields = {
  name: string;
  color: string;
  description?: string;
  intervals: { start: string; end: string }[];
  breaks?: { start: string; end: string }[];
  breakMinutes: number;
  breakPaid: boolean;
};

function breakDuration(interval: { start: string; end: string }): number {
  const [startHours, startMinutes] = interval.start.split(":").map(Number);
  const [endHours, endMinutes] = interval.end.split(":").map(Number);
  const difference =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  return difference >= 0 ? difference : difference + 24 * 60;
}

function totalBreakMinutes(breaks: { start: string; end: string }[]): number {
  return breaks.reduce((total, interval) => total + breakDuration(interval), 0);
}

function validateShift(fields: ShiftFields) {
  const name = fields.name.trim();
  if (name.length === 0 || name.length > 60) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El nombre debe tener entre 1 y 60 caracteres",
    });
  }
  if (!colorPattern.test(fields.color)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Color hexadecimal no válido",
    });
  }
  if (fields.intervals.length === 0 || fields.intervals.length > 4) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Debe haber entre 1 y 4 intervalos",
    });
  }
  for (const interval of fields.intervals) {
    if (!timePattern.test(interval.start) || !timePattern.test(interval.end)) {
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
  if (fields.breaks !== undefined) {
    if (fields.breaks.length > 3) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Máximo 3 descansos",
      });
    }
    for (const rest of fields.breaks) {
      if (!timePattern.test(rest.start) || !timePattern.test(rest.end)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Las horas de descanso deben usar el formato HH:mm",
        });
      }
      if (rest.start === rest.end) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "El descanso no puede empezar y acabar a la misma hora",
        });
      }
    }
  }
  if (
    !Number.isInteger(fields.breakMinutes) ||
    fields.breakMinutes < 0 ||
    fields.breakMinutes > 480
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La pausa debe estar entre 0 y 480 minutos",
    });
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    const shifts = await ctx.db
      .query("shiftTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return shifts.filter((shift) => shift.archivedAt === undefined);
  },
});

export const create = mutation({
  args: shiftFields,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Debes iniciar sesión",
      });
    }
    validateShift(args);
    return await ctx.db.insert("shiftTypes", {
      userId,
      name: args.name.trim(),
      color: args.color,
      description: args.description?.trim(),
      intervals: args.intervals,
      breaks: args.breaks,
      breakMinutes: args.breaks
        ? totalBreakMinutes(args.breaks)
        : args.breakMinutes,
      breakPaid: args.breakPaid,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("shiftTypes"), ...shiftFields },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Debes iniciar sesión",
      });
    }
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Turno no encontrado",
      });
    }
    validateShift(args);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      color: args.color,
      description: args.description?.trim(),
      intervals: args.intervals,
      breaks: args.breaks,
      breakMinutes: args.breaks
        ? totalBreakMinutes(args.breaks)
        : args.breakMinutes,
      breakPaid: args.breakPaid,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id("shiftTypes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Debes iniciar sesión",
      });
    }
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Turno no encontrado",
      });
    }
    await ctx.db.patch(args.id, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
