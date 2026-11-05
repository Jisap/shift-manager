/**
 * Pruebas E2E (Playwright) del flujo de autenticación.
 *
 * Cubren dos escenarios: que el dashboard no se pueda ver sin sesión y el
 * recorrido completo de registro, sesión persistente y cierre de sesión.
 * Los textos que se buscan son los de la interfaz en español.
 */

import { expect, test } from "@playwright/test";

/**
 * Genera un email distinto en cada ejecución (marca de tiempo + sufijo
 * aleatorio) para que el registro no choque con cuentas creadas en pruebas
 * anteriores. El dominio `example.com` está reservado y nunca recibe correo.
 */
function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test("protege el dashboard sin sesión", async ({ page }) => {
  // Visitar una ruta protegida sin haber iniciado sesión...
  await page.goto("/dashboard");

  // ...debe mostrar el aviso de inicio de sesión en lugar del contenido.
  await expect(page.getByText("Inicia sesión")).toBeVisible();
});

test("registro, sesión persistente y cierre de sesión", async ({ page }) => {
  const email = uniqueEmail();

  // 1. Cambiar el formulario de acceso al modo de registro y comprobar que el
  //    texto de bienvenida del registro aparece.
  await page.goto("/signin");
  await page.getByRole("button", { name: "No tengo cuenta" }).click();
  await expect(
    page.getByText("Regístrate para empezar a organizar tus turnos."),
  ).toBeVisible();

  // 2. Rellenar el formulario y crear la cuenta. `exact: true` evita que el
  //    selector coincida con otros botones cuyo nombre contenga ese texto.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Contrasena123!");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();

  // 3. Esperar la confirmación de sesión. El tiempo de espera es mayor que el
  //    de por defecto porque el registro depende de una llamada al backend.
  await expect(page.getByText("Sesión iniciada")).toBeVisible({
    timeout: 20_000,
  });

  // 4. Con sesión, el dashboard se muestra y ya no aparece el aviso de
  //    inicio de sesión.
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();
  await expect(page.getByText("Inicia sesión")).toHaveCount(0);

  // 5. Persistencia: tras recargar la página la sesión sigue activa.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();

  // 6. Cierre de sesión: desde la pantalla de acceso se cierra la sesión y
  //    el formulario vuelve a su estado de inicio de sesión.
  await page.goto("/signin");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByText("Accede con tu email y contraseña."),
  ).toBeVisible();
});
