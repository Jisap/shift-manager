// @vitest-environment node

/**
 * Pruebas de integración de las excepciones de calendario contra el esquema
 * real de Convex. Se usa `convex-test` para ejecutar las mutations en memoria.
 *
 * Caso 19 de §12.1: una segunda excepción en la misma fecha debe rechazarse
 * con `CONFLICT`.
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("overrides.create", () => {
  it("rechaza una segunda excepción para la misma fecha", async () => {
    const t = convexTest(schema, modules);
    // Se crea un usuario real para que `userId` cumpla el validador `v.id`.
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.overrides.create, {
      date: "2026-11-09",
      kind: "rest",
    });

    await expect(
      asUser.mutation(api.overrides.create, {
        date: "2026-11-09",
        kind: "rest",
      }),
    ).rejects.toMatchObject({ data: { code: "CONFLICT" } });

    // La primera excepción sigue existiendo y no se ha duplicado.
    const stored = await asUser.query(api.overrides.listRange, {
      startDate: "2026-11-09",
      endDate: "2026-11-09",
    });
    expect(stored).toHaveLength(1);
  });

  it("permite excepciones en fechas distintas", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.overrides.create, {
      date: "2026-11-09",
      kind: "rest",
    });
    await asUser.mutation(api.overrides.create, {
      date: "2026-11-10",
      kind: "rest",
    });

    const stored = await asUser.query(api.overrides.listRange, {
      startDate: "2026-11-09",
      endDate: "2026-11-10",
    });
    expect(stored).toHaveLength(2);
  });
});
