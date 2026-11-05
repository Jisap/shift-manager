import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";

async function goToDashboardWithExport(page: Parameters<typeof signUpNewUser>[0]) {
  await signUpNewUser(page);
  await page.goto("/dashboard");

  // Los botones solo se activan con rango válido y datos cargados.
  const csvButton = page.getByRole("button", { name: "CSV" });
  await expect(csvButton).toBeEnabled({ timeout: 20_000 });
  return csvButton;
}

test("exporta el periodo a CSV", async ({ page }) => {
  const csvButton = await goToDashboardWithExport(page);

  const downloadPromise = page.waitForEvent("download");
  await csvButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^shiftmanager-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/,
  );

  const path = await download.path();
  const content = await readFile(path!, "utf8");
  expect(content.startsWith("\uFEFF")).toBe(true);
  expect(content).toContain("Fecha,Día,Turno");
  expect(content).toContain("Total");
});

test("exporta el periodo a PDF", async ({ page }) => {
  await goToDashboardWithExport(page);
  const pdfButton = page.getByRole("button", { name: "PDF" });
  await expect(pdfButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await pdfButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^shiftmanager-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});
