/**
 * Generación de CSV en cliente.
 *
 * Formato compatible con Excel y LibreOffice: UTF-8 con BOM (lo añade el
 * descargador), separador coma, comillas dobles para escapar campos y saltos
 * de línea CRLF. Las horas se expresan en decimal para que la hoja de cálculo
 * las trate como números.
 */

import { decimalHours, type ExportData } from "./export-data";

const BOM = "\uFEFF";
const LINE_BREAK = "\r\n";

const HEADERS = [
  "Fecha",
  "Día",
  "Turno",
  "Horario",
  "Horas previstas",
  "Horas reales",
  "Exceso",
  "Categoría",
  "Festivo",
  "Jornada extra",
  "Vacaciones",
] as const;

/**
 * Escapa un campo CSV. Se entrecomilla si contiene coma, comillas, salto de
 * línea o espacios al principio/final; las comillas internas se duplican.
 */
export function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value) && value === value.trim()) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/** Une varias filas ya escapadas con el separador y el salto de línea. */
export function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((field) => escapeCsvField(field)).join(","))
    .join(LINE_BREAK);
}

/**
 * Construye el CSV completo de un periodo: cabecera, una fila por día y una
 * fila final de totales.
 */
export function buildCsv(data: ExportData): string {
  const rows: string[][] = [Array.from(HEADERS)];

  for (const row of data.rows) {
    rows.push([
      row.date,
      row.weekday,
      row.shift,
      row.intervals,
      decimalHours(row.plannedMinutes),
      decimalHours(row.actualMinutes),
      decimalHours(row.overtimeMinutes),
      row.category,
      row.isHoliday ? "Sí" : "No",
      row.isExtraDay ? "Sí" : "No",
      row.isVacation ? "Sí" : "No",
    ]);
  }

  rows.push([
    "Total",
    "",
    "",
    "",
    decimalHours(data.summary.plannedMinutes),
    decimalHours(data.summary.actualMinutes),
    decimalHours(data.summary.overtimeMinutes),
    "",
    "",
    "",
    "",
  ]);

  return BOM + toCsv(rows);
}

/** Nombre de archivo estable para la descarga. */
export function csvFileName(data: ExportData): string {
  return `shiftmanager-${data.startDate}_${data.endDate}.csv`;
}
