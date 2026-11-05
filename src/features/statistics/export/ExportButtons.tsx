"use client";

/**
 * Botones de exportación del dashboard.
 *
 * El CSV se genera en cliente (UTF-8 con BOM) y el PDF con
 * `@react-pdf/renderer`, que se carga de forma dinámica para no incluirlo en el
 * bundle inicial. Ambos usan los datos ya cargados del periodo.
 */

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildCsv, csvFileName } from "@/lib/export/csv";
import type { ExportData } from "@/lib/export/export-data";
import { downloadBlob } from "@/lib/export/download";

/**
 * `data` es `undefined` mientras el periodo aún se está cargando; en ese caso
 * ambos botones quedan desactivados.
 */
export function ExportButtons({ data }: { data: ExportData | undefined }) {
  // Solo el PDF tiene estado de carga: generarlo es asíncrono y puede tardar,
  // mientras que el CSV se construye al instante.
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ambos botones se bloquean sin datos o mientras se genera el PDF, para no
  // lanzar dos exportaciones a la vez.
  const disabled = data === undefined || exportingPdf;

  /** Genera el CSV en memoria y lo descarga. No necesita estado de carga. */
  function handleCsv() {
    // Comprobación de seguridad (el botón ya está desactivado sin datos); sirve
    // también para que TypeScript sepa que `data` está definido.
    if (data === undefined) {
      return;
    }
    setError(null);
    const blob = new Blob([buildCsv(data)], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blob, csvFileName(data));
  }

  /**
   * Genera el PDF y lo descarga. La librería y el documento se importan de
   * forma dinámica (y en paralelo) la primera vez que se pulsa el botón, para
   * que `@react-pdf/renderer` no engorde el bundle inicial del dashboard.
   */
  async function handlePdf() {
    if (data === undefined) {
      return;
    }
    setExportingPdf(true);
    setError(null);
    try {
      const [{ pdf }, { CalendarPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./CalendarPdfDocument"),
      ]);
      const blob = await pdf(<CalendarPdfDocument data={data} />).toBlob();
      downloadBlob(
        blob,
        `shiftmanager-${data.startDate}_${data.endDate}.pdf`,
      );
    } catch {
      setError("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      // Se ejecuta tanto si hay éxito como si hay error.
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCsv}
          disabled={disabled}
        >
          <Download aria-hidden />
          CSV
        </Button>
        {/* Mientras se genera el PDF, el icono de descarga se sustituye por un
            indicador giratorio */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePdf}
          disabled={disabled}
        >
          {exportingPdf ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          PDF
        </Button>
      </div>
      {/* Mensaje de error de la generación del PDF, debajo de los botones */}
      {error !== null ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
    </div>
  );
}