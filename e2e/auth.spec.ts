import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";

test("protege el dashboard sin sesión", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText("Inicia sesión")).toBeVisible();
});

test("registro, sesión persistente y cierre de sesión", async ({ page }) => {
  await signUpNewUser(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Inicia sesión")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/signin");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByText("Accede con tu email y contraseña."),
  ).toBeVisible();
});
