import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  DEFAULT_REMINDER_SETTINGS,
  validateReminderSettings,
  type ReminderSettings,
} from "../src/lib/reminders/settings";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type DbContext = QueryCtx | MutationCtx;

/** Extrae el userId autenticado o lanza `UNAUTHENTICATED`. */
async function requireUserId(ctx: DbContext): Promise<Id<"users">> {
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
 * Ajustes de recordatorios del usuario. Si nunca los ha guardado devuelve los
 * valores por defecto (desactivados).
 */
export const getSettings = query({
  args: {},
  handler: async (ctx): Promise<ReminderSettings> => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    return user?.reminderSettings ?? DEFAULT_REMINDER_SETTINGS;
  },
});

/** Guarda los ajustes de recordatorios del usuario autenticado. */
export const updateSettings = mutation({
  args: {
    enabled: v.boolean(),
    leadMinutes: v.number(),
    notifyChanges: v.boolean(),
  },
  handler: async (ctx, args): Promise<ReminderSettings> => {
    const userId = await requireUserId(ctx);
    const settings: ReminderSettings = {
      enabled: args.enabled,
      leadMinutes: args.leadMinutes,
      notifyChanges: args.notifyChanges,
    };
    const error = validateReminderSettings(settings);
    if (error !== null) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: error });
    }

    await ctx.db.patch(userId, { reminderSettings: settings });
    return settings;
  },
});
