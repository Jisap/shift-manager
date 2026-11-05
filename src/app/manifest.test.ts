import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest PWA", () => {
  it("declara una aplicación instalable en español", () => {
    const result = manifest();

    expect(result.name).toBe("ShiftManager");
    expect(result.lang).toBe("es");
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.theme_color).toBe("#4f46e5");
  });

  it("incluye los iconos requeridos y uno maskable", () => {
    const icons = manifest().icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);

    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
