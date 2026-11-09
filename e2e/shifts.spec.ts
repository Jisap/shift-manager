/**
 * Pruebas E2E del gestor de tipos de turno.
 *
 * Cubren la creación y la duplicación, que son las acciones que no estaban
 * versionadas. Cada prueba crea su propia cuenta para no depender de datos
 * previos ni del orden de ejecución.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";

test("crea y duplica un turno", async ({ page }) => {
  await signUpNewUser(page);
  await page.goto("/shifts");

  // Alta del turno original.
  await page.getByLabel("Nombre").fill("Mañana");
  await page.getByRole("button", { name: "Crear turno" }).click();
  await expect(page.getByText("Mañana", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  // El botón Duplicar está en la tarjeta del turno recién creado.
  await page.getByRole("button", { name: "Duplicar" }).click();
  await expect(page.getByText("Mañana (copia)", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  // La copia se ha persistido: tras recargar sigue apareciendo.
  await page.reload();
  await expect(page.getByText("Mañana (copia)", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
});
