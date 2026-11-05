/**
 * Descarga de un Blob en el navegador mediante un enlace temporal.
 *
 * Se usa en las exportaciones de cliente (CSV y PDF). El objeto URL se libera
 * en cuanto el navegador inicia la descarga.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
