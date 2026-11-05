/**
 * Utilidades de autenticación compartidas por las pruebas E2E.
 *
 * Centralizan el alta de usuarios de prueba para que cada spec no repita el
 * recorrido por la interfaz.
 */

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

  // Pasar del formulario de acceso al de registro y comprobar que el cambio
  // se ha producido antes de rellenar nada.
  await page.goto("/signin");
  await page.getByRole("button", { name: "No tengo cuenta" }).click();
  await expect(
    page.getByText("Regístrate para empezar a organizar tus turnos."),
  ).toBeVisible();

  // Rellenar y enviar. `exact: true` evita que el selector coincida con otros
  // botones cuyo nombre contenga "Crear cuenta".
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();

  // Esperar la confirmación de sesión. El margen de 20 s es mayor que el de
  // por defecto porque el registro depende de una llamada al backend.
  await expect(page.getByText("Sesión iniciada")).toBeVisible({
    timeout: 20_000,
  });

  return email;
}