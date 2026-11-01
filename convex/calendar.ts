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
