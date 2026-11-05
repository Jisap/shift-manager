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

export function ExportButtons({ data }: { data: ExportData | undefined }) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = data === undefined || exportingPdf;

  function handleCsv() {
    if (data === undefined) {
      return;
    }
    setError(null);
    const blob = new Blob([buildCsv(data)], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blob, csvFileName(data));
  }

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
      {error !== null ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
    </div>
  );
}
