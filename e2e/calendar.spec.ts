/**
 * Pruebas E2E de la edición del calendario.
 *
 * Cubren una excepción puntual (cambio de turno y restauración del patrón) y
 * la gestión manual de festivos de un día concreto.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";
import {
  closeDayEditor,
  createShift,
  goToAgenda,
  openDayEditor,
  todayRow,
} from "./helpers/flows";

test("crea una excepción de turno y la restaura al patrón", async ({ page }) => {
  await signUpNewUser(page);
  await createShift(page, "Tarde calendario", { start: "14:00", end: "22:00" });

  await goToAgenda(page);
  await openDayEditor(page);

  // La pestaña "Turno / Excepción" está activa por defecto.
  await page.locator("#override-kind").selectOption("shift");
  await page.locator("#override-shift").selectOption({ label: "Tarde calendario" });
  await page.locator("#override-notes").fill("Cambio puntual E2E");
  await page.getByRole("button", { name: "Guardar turno" }).click();
  await expect(
    page.getByRole("heading", { name: /Gestión del día/ }),
  ).toHaveCount(0);

  await expect(todayRow(page)).toContainText("Tarde calendario");
  await expect(todayRow(page)).toContainText("Cambio puntual E2E");

  // Al reabrir, la excepción ya existe y se puede restaurar el patrón.
  await openDayEditor(page);
  await expect(
    page.getByRole("button", { name: "Restaurar al patrón" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restaurar al patrón" }).click();
  await expect(
    page.getByRole("heading", { name: /Gestión del día/ }),
  ).toHaveCount(0);

  await expect(todayRow(page)).not.toContainText("Tarde calendario");
  await expect(todayRow(page)).toContainText(/descanso/i);
});

test("añade y quita un festivo de un día", async ({ page }) => {
  await signUpNewUser(page);
  await goToAgenda(page);
  await openDayEditor(page);

  await page.getByRole("button", { name: "Festivos" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Fiesta local E2E");
  await page.getByLabel("Ámbito").selectOption("local");
  await page.getByRole("button", { name: "Añadir festivo" }).click();

  await expect(page.getByText("Fiesta local E2E").first()).toBeVisible();
  await closeDayEditor(page);
  await expect(todayRow(page)).toContainText("Fiesta local E2E");

  // Quitar el festivo devuelve el día a su estado sin marcar.
  await openDayEditor(page);
  await page.getByRole("button", { name: "Festivos" }).click();
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(
    page.getByText("Este día no está marcado como festivo."),
  ).toBeVisible();
  await closeDayEditor(page);
  await expect(todayRow(page)).not.toContainText("Fiesta local E2E");
});
