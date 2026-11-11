/**
 * Flujos compartidos por las pruebas E2E.
 *
 * Centralizan los recorridos que se repiten entre specs (crear un turno, crear
 * un patrón, abrir el editor de un día) para que cada prueba se centre en lo
 * que valida y no en los detalles de navegación.
 */

import { expect, type Page } from "@playwright/test";

/** Fecha de hoy como `YYYY-MM-DD` en la hora local del navegador de pruebas. */
export function todayKey(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

/**
 * En móvil los formularios de turnos y patrones están colapsados tras un botón
 * "Nuevo". En escritorio el formulario ya es visible y el botón no existe.
 */
export async function ensureFormOpen(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 1024) {
    const newButton = page.getByRole("button", { name: "Nuevo", exact: true });
    await expect(newButton).toBeVisible();
    await newButton.click();
  }
}

/** Crea un tipo de turno desde `/shifts` y espera a que aparezca en el catálogo. */
export async function createShift(
  page: Page,
  name: string,
  interval: { start: string; end: string } = { start: "08:00", end: "16:00" },
): Promise<void> {
  await page.goto("/shifts");
  await expect(
    page.getByRole("heading", { name: "Catálogo de turnos" }),
  ).toBeVisible();
  await ensureFormOpen(page);

  await page.getByLabel("Nombre del turno").fill(name);
  await page.getByLabel("Entrada 1").fill(interval.start);
  await page.getByLabel("Salida 1").fill(interval.end);
  await page.getByRole("button", { name: "Crear turno", exact: true }).click();

  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

type PatternOptions = {
  name: string;
  type?: "weekly" | "rotating";
  cycleLength?: number;
  shiftName?: string;
  /** Posiciones del ciclo (1-based) a las que asignar `shiftName`. */
  assignDays?: number[];
};

/** Crea un patrón desde `/patterns` y comprueba que queda en el catálogo. */
export async function createPattern(
  page: Page,
  {
    name,
    type = "weekly",
    cycleLength,
    shiftName,
    assignDays = [1],
  }: PatternOptions,
): Promise<void> {
  await page.goto("/patterns");
  await expect(
    page.getByRole("heading", { name: "Patrones de turnos" }),
  ).toBeVisible();
  await ensureFormOpen(page);

  await page.getByLabel("Nombre del patrón").fill(name);

  if (type === "rotating") {
    await page.getByRole("button", { name: "Rotativo libre" }).click();
    if (cycleLength !== undefined) {
      await page.getByLabel("Duración del ciclo (días)").fill(String(cycleLength));
    }
  }

  if (shiftName) {
    for (const dayIndex of assignDays) {
      await page
        .getByLabel(`Turno del día ${dayIndex}`)
        .selectOption({ label: shiftName });
    }
  }

  await page.getByRole("button", { name: "Crear patrón", exact: true }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

/** Abre el calendario en la vista Agenda y espera a la fila de hoy. */
export async function goToAgenda(page: Page): Promise<void> {
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Agenda", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(todayRow(page)).toBeVisible();
}

/** Fila de hoy en la vista Agenda (único elemento con `aria-current="date"`). */
export function todayRow(page: Page) {
  return page.locator('button[aria-current="date"]');
}

/**
 * Pulsa la fila de hoy y abre el panel completo de edición.
 *
 * En móvil se interpone la hoja de acciones rápidas, así que se pulsa su
 * acción para abrir el editor completo.
 */
export async function openDayEditor(page: Page): Promise<void> {
  await todayRow(page).click();

  // En la vista Agenda el clic abre directamente el editor completo. En las
  // vistas de cuadrícula, en móvil se interpone la hoja de acciones rápidas.
  const editorHeading = page.getByRole("heading", { name: /Gestión del día/ });
  const quickActions = page.getByRole("dialog");

  await expect(editorHeading.or(quickActions)).toBeVisible();

  if (await quickActions.isVisible().catch(() => false)) {
    await quickActions
      .getByRole("button", {
        name: /Editar fichaje\/extra|Abrir editor completo/,
      })
      .first()
      .click();
  }

  await expect(editorHeading).toBeVisible();
}

/** Cierra el panel de edición del día y espera a que desaparezca. */
export async function closeDayEditor(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Cerrar panel de edición" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Gestión del día/ }),
  ).toHaveCount(0);
}
