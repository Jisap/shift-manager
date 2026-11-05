/**
 * Pruebas E2E (Playwright) del flujo de autenticación.
 *
 * Cubren dos escenarios: que el dashboard no se pueda ver sin sesión y el
 * recorrido completo de registro, sesión persistente y cierre de sesión.
 * El alta de la cuenta vive en `helpers/auth.ts` (`signUpNewUser`), compartido
 * con las demás pruebas. Los textos que se buscan son los de la interfaz en
 * español.
 */

import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers/auth";

test("protege el dashboard sin sesión", async ({ page }) => {
  // Visitar una ruta protegida sin haber iniciado sesión...
  await page.goto("/dashboard");

  // ...debe mostrar el aviso de inicio de sesión en lugar del contenido.
  await expect(page.getByText("Inicia sesión")).toBeVisible();
});

test("registro, sesión persistente y cierre de sesión", async ({ page }) => {
  // 1. Crear una cuenta nueva desde la interfaz. El helper espera a que la
  //    sesión esté iniciada antes de devolver el control.
  await signUpNewUser(page);

  // 2. Con sesión, el dashboard se muestra y ya no aparece el aviso de
  //    inicio de sesión (`toHaveCount(0)`: ningún elemento con ese texto).
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Inicia sesión")).toHaveCount(0);

  // 3. Persistencia: tras recargar la página la sesión sigue activa.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // 4. Cierre de sesión: desde la pantalla de acceso se cierra la sesión y
  //    el formulario vuelve a su estado de inicio de sesión.
  await page.goto("/signin");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByText("Accede con tu email y contraseña."),
  ).toBeVisible();
});
