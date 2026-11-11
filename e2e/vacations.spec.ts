/**
 * Pruebas E2E de las vacaciones.
 *
 * Configura el saldo anual, registra un día con nota, comprueba los totales y
 * elimina el día dejando el saldo disponible de nuevo.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";
import { todayKey } from "./helpers/flows";

/** Tarjeta de saldo que contiene la etiqueta indicada. */
function balanceCard(page: Parameters<typeof signUpNewUser>[0], label: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: label });
}

test("registra un día de vacaciones y actualiza el saldo", async ({ page }) => {
  await signUpNewUser(page);
  await page.goto("/vacations");
  await expect(
    page.getByRole("heading", { name: "Vacaciones", exact: true }),
  ).toBeVisible();

  // Saldo anual de 22 días.
  await page.locator("#allocated-days").fill("22");
  await page.getByRole("button", { name: "Guardar saldo" }).click();
  await expect(balanceCard(page, "Días asignados")).toContainText("22");

  // Alta de un día con nota.
  await page.locator("#vacation-date").fill(todayKey());
  await page.locator("#vacation-note").fill("Viaje E2E");
  await page.getByRole("button", { name: "Añadir día" }).click();

  await expect(page.getByText("Viaje E2E")).toBeVisible();
  await expect(page.getByText("1 día registrado")).toBeVisible();
  await expect(balanceCard(page, "Días utilizados")).toContainText("1");
  await expect(balanceCard(page, "Días disponibles")).toContainText("21");

  // Persistencia tras recargar.
  await page.reload();
  await expect(page.getByText("Viaje E2E")).toBeVisible();
  await expect(page.getByText("1 día registrado")).toBeVisible();

  // Al quitar el día vuelve a estar todo disponible.
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(
    page.getByText("Todavía no hay días de vacaciones"),
  ).toBeVisible();
  await expect(balanceCard(page, "Días disponibles")).toContainText("22");
});
