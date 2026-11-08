import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  DEFAULT_LOCALE,
  normalizeTimezone,
  validateProfileInput,
  type UserProfile,
} from "../src/lib/validators/profile";

type DbContext = QueryCtx | MutationCtx;
type UserId = Id<"users">;

/** Extrae el userId autenticado o lanza `UNAUTHENTICATED`. */
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

/** Perfil del usuario autenticado, con valores por defecto si faltan campos. */
export const getProfile = query({
  args: {},
  handler: async (ctx): Promise<UserProfile> => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      timezone: normalizeTimezone(user?.timezone),
      locale: user?.locale ?? DEFAULT_LOCALE,
    };
  },
});

/**
 * Actualiza el nombre y la zona horaria del usuario autenticado.
 *
 * La zona horaria se usa en el motor de turnos, los cálculos de horas y los
 * recordatorios, por eso se valida aquí aunque el formulario ya lo haga.
 */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args): Promise<UserProfile> => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    const error = validateProfileInput({ name, timezone: args.timezone });
    if (error !== null) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: error });
    }

    await ctx.db.patch(userId, {
      name: name.length > 0 ? name : undefined,
      timezone: args.timezone,
    });

    const user = await ctx.db.get(userId);
    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      timezone: normalizeTimezone(user?.timezone),
      locale: user?.locale ?? DEFAULT_LOCALE,
    };
  },
});
