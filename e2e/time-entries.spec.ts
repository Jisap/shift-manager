/**
 * Pruebas E2E del registro de horas reales y de las horas extra.
 *
 * Registra un fichaje con pausa, comprueba el resumen calculado y su
 * persistencia, y después declara un tramo de hora extra sobre ese mismo día.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";
import {
  closeDayEditor,
  goToAgenda,
  openDayEditor,
  todayRow,
} from "./helpers/flows";

test("registra horas reales y una hora extra", async ({ page }) => {
  await signUpNewUser(page);
  await goToAgenda(page);
  await openDayEditor(page);

  // Fichaje real: 8 h de presencia con 30 min de pausa = 7 h 30 min netas.
  await page.getByRole("button", { name: "Fichaje real" }).click();
  await page.locator("#actual-start").fill("08:00");
  await page.locator("#actual-end").fill("16:00");
  await page.locator("#actual-breaks").fill("30");
  await expect(
    page.getByText(
      "8 h de presencia · 0 h 30 min de pausa · 7 h 30 min trabajadas",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar horas reales" }).click();
  await expect(
    page.getByRole("button", { name: "Quitar horas reales" }),
  ).toBeVisible();

  await closeDayEditor(page);
  await expect(todayRow(page)).toContainText("Real 7 h 30 min");

  // Persistencia: al reabrir el día se recuperan las horas guardadas.
  await openDayEditor(page);
  await page.getByRole("button", { name: "Fichaje real" }).click();
  await expect(page.locator("#actual-start")).toHaveValue("08:00");
  await expect(page.locator("#actual-end")).toHaveValue("16:00");
  await expect(page.locator("#actual-breaks")).toHaveValue("30");

  // Hora extra declarada de 16:00 a 17:00.
  await page.getByRole("button", { name: "Horas extra" }).click();
  await page
    .getByLabel("He realizado horas extra sobre este turno")
    .check();
  await page.getByLabel("Inicio del tramo 1").fill("16:00");
  await page.getByLabel("Fin del tramo 1").fill("17:00");
  await page.getByRole("button", { name: "Guardar horas extra" }).click();
  await expect(
    page.getByRole("button", { name: "Quitar horas extra" }),
  ).toBeVisible();

  await closeDayEditor(page);
  await expect(todayRow(page)).toContainText("+1 h extra");
});
