/**
 * Pruebas E2E del gestor de tipos de turno.
 *
 * Cubren la creación, duplicación, edición y archivo de turnos. Cada prueba
 * crea su propia cuenta para no depender de datos previos ni del orden de
 * ejecución.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";
import { ensureFormOpen } from "./helpers/flows";

test("crea y duplica un turno", async ({ page }) => {
  await signUpNewUser(page);
  await page.goto("/shifts");
  await ensureFormOpen(page);

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

test("edita y archiva un turno", async ({ page }) => {
  await signUpNewUser(page);
  await page.goto("/shifts");
  await ensureFormOpen(page);

  // Alta del turno que se va a editar.
  await page.getByLabel("Nombre").fill("Tarde");
  await page.getByRole("button", { name: "Crear turno" }).click();
  await expect(page.getByText("Tarde", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  // Edición del nombre desde la tarjeta.
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Nombre").fill("Tarde modificada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Tarde modificada", { exact: true })).toBeVisible(
    { timeout: 20_000 },
  );

  // Archivo: la tarjeta desaparece de la lista de turnos activos.
  await page.getByRole("button", { name: "Archivar" }).click();
  await expect(page.getByText("Tarde modificada", { exact: true })).toHaveCount(
    0,
    { timeout: 20_000 },
  );
});
