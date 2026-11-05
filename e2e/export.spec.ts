/**
 * Pruebas E2E (Playwright) de la exportación del dashboard a CSV y PDF.
 *
 * Cada prueba crea su propia cuenta, abre el dashboard y descarga el archivo
 * con el botón correspondiente. Se comprueba el nombre del archivo y, en el
 * CSV, también su contenido.
 */

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";

/**
 * Registra un usuario nuevo, abre el dashboard y espera a que la exportación
 * esté disponible. Devuelve el botón "CSV" ya habilitado.
 * El tipo del parámetro se toma del helper (`Page` de Playwright) para no
 * importarlo por separado.
 */
async function goToDashboardWithExport(page: Parameters<typeof signUpNewUser>[0]) {
  await signUpNewUser(page);
  await page.goto("/dashboard");

  // Los botones solo se activan con rango válido y datos cargados.
  // Se espera hasta 20 s porque dependen de consultas al backend.
  const csvButton = page.getByRole("button", { name: "CSV" });
  await expect(csvButton).toBeEnabled({ timeout: 20_000 });
  return csvButton;
}

test("exporta el periodo a CSV", async ({ page }) => {
  const csvButton = await goToDashboardWithExport(page);

  // Se registra la espera de la descarga ANTES de pulsar el botón; si se
  // hiciera después, el evento podría perderse.
  const downloadPromise = page.waitForEvent("download");
  await csvButton.click();
  const download = await downloadPromise;

  // Nombre: shiftmanager-<inicio>_<fin>.csv, con fechas "yyyy-MM-dd".
  expect(download.suggestedFilename()).toMatch(
    /^shiftmanager-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/,
  );

  // Contenido: se lee el archivo descargado del disco temporal de Playwright.
  const path = await download.path();
  const content = await readFile(path!, "utf8");
  // El BOM (\uFEFF) hace que Excel interprete el archivo como UTF-8 y respete
  // los acentos.
  expect(content.startsWith("\uFEFF")).toBe(true);
  // Cabecera de las columnas y fila de totales.
  expect(content).toContain("Fecha,Día,Turno");
  expect(content).toContain("Total");
});

test("exporta el periodo a PDF", async ({ page }) => {
  await goToDashboardWithExport(page);
  // El botón PDF se habilita junto con el de CSV, pero se comprueba por separado.
  const pdfButton = page.getByRole("button", { name: "PDF" });
  await expect(pdfButton).toBeEnabled();

  // Igual que en el CSV: la espera de la descarga se crea antes del clic.
  const downloadPromise = page.waitForEvent("download");
  await pdfButton.click();
  const download = await downloadPromise;

  // Esta prueba solo valida el nombre del archivo; no inspecciona el
  // contenido del PDF.
  expect(download.suggestedFilename()).toMatch(
    /^shiftmanager-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});