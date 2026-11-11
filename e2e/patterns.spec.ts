/**
 * Pruebas E2E de los patrones de trabajo.
 *
 * Cubren la creación de un patrón semanal con turnos asignados, su aplicación
 * al calendario como excepciones y la creación de un ciclo rotativo que
 * persiste tras recargar.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";
import {
  createPattern,
  createShift,
  goToAgenda,
  todayKey,
  todayRow,
} from "./helpers/flows";

test("crea un patrón semanal y lo aplica al calendario", async ({ page }) => {
  await signUpNewUser(page);
  await createShift(page, "Mañana E2E", { start: "07:00", end: "15:00" });
  await createPattern(page, {
    name: "Semanal mañana",
    shiftName: "Mañana E2E",
  });

  await expect(page.getByText("Semanal (7 días)").last()).toBeVisible();

  // Aplicar el patrón a partir de hoy genera una excepción por cada día del
  // ciclo; el día 0 (hoy) recibe el turno de mañana.
  await page.getByRole("button", { name: "Aplicar a fecha..." }).click();
  const dialog = page.getByRole("dialog", {
    name: "Aplicar a fecha / semana",
  });
  await expect(dialog).toBeVisible();
  await dialog.locator("#targetStartDate").fill(todayKey());
  await dialog.getByRole("button", { name: "Aplicar turnos" }).click();
  await expect(
    page.getByText("¡Turnos aplicados correctamente al calendario!"),
  ).toBeVisible();

  await goToAgenda(page);
  await expect(todayRow(page)).toContainText("Mañana E2E");
});

test("crea un ciclo rotativo y lo conserva tras recargar", async ({ page }) => {
  await signUpNewUser(page);
  await createShift(page, "Tarde E2E", { start: "15:00", end: "23:00" });
  await createPattern(page, {
    name: "Ciclo 6-2",
    type: "rotating",
    cycleLength: 6,
    shiftName: "Tarde E2E",
    assignDays: [1, 2],
  });

  await expect(page.getByText("Rotativo (6 días)")).toBeVisible();
  await expect(page.getByText("D1", { exact: true })).toBeVisible();
  await expect(page.getByText("D6", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Ciclo 6-2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rotativo (6 días)")).toBeVisible();
});
