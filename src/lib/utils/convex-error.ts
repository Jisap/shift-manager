/**
 * Extrae el mensaje de error legible de una excepción lanzada por Convex.
 * Convex serializa los errores con `ConvexError` como `{ data: { message } }`.
 * Si la estructura no coincide, devuelve el texto de `fallback`.
 */
export function convexErrorMessage(error: unknown, fallback: string): string {
  if (error === null || typeof error !== "object" || !("data" in error)) {
    return fallback;
  }
  const data = (error as { data?: unknown }).data;
  if (data === null || typeof data !== "object" || !("message" in data)) {
    return fallback;
  }
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}
