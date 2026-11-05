import { expect, type Page } from "@playwright/test";

/** Email único por ejecución para no chocar con cuentas anteriores. */
export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Contraseña válida para el alta (mínimo 8 caracteres). */
export const TEST_PASSWORD = "Contrasena123!";

/**
 * Crea una cuenta nueva desde la interfaz y espera a estar autenticado.
 * Devuelve el email usado, por si el test necesita reutilizarlo.
 */
export async function signUpNewUser(page: Page) {
  const email = uniqueEmail();

  await page.goto("/signin");
  await page.getByRole("button", { name: "No tengo cuenta" }).click();
  await expect(
    page.getByText("Regístrate para empezar a organizar tus turnos."),
  ).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();

  await expect(page.getByText("Sesión iniciada")).toBeVisible({
    timeout: 20_000,
  });

  return email;
}
