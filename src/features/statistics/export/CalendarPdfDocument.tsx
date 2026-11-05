/**
 * Documento PDF del calendario y el resumen de horas.
 *
 * Se genera en cliente con `@react-pdf/renderer` (ver `shiftManager.md` §5.16).
 * El módulo se importa de forma dinámica desde `ExportButtons` para que no
 * entre en el bundle del servidor.
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ExportData } from "@/lib/export/export-data";

const COLORS = {
  primary: "#2563eb",
  text: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  background: "#f1f5f9",
  positive: "#047857",
  negative: "#be123c",
};

const styles = StyleSheet.create({
  page: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  period: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 11,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 8,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 3,
  },
  cellDate: { width: "12%" },
  cellWeekday: { width: "13%" },
  cellShift: { width: "18%" },
  cellIntervals: { width: "21%" },
  cellNumber: { width: "9%", textAlign: "right" },
  cellCategory: { width: "18%" },
  positive: { color: COLORS.positive },
  negative: { color: COLORS.negative },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: "center",
  },
});

function hours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} h`;
}

function signedHours(minutes: number): string {
  if (minutes === 0) {
    return "0.00 h";
  }
  const sign = minutes > 0 ? "+" : "−";
  return `${sign}${(Math.abs(minutes) / 60).toFixed(2)} h`;
}

function differenceStyle(minutes: number) {
  if (minutes > 0) {
    return styles.positive;
  }
  if (minutes < 0) {
    return styles.negative;
  }
  return undefined;
}

/** Fecha larga legible a partir de "yyyy-MM-dd". */
function longDate(date: string): string {
  return format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function CalendarPdfDocument({ data }: { data: ExportData }) {
  const { summary } = data;

  return (
    <Document
      title={`ShiftManager ${data.startDate} – ${data.endDate}`}
      author="ShiftManager"
      subject="Calendario y resumen de horas"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ShiftManager</Text>
        <Text style={styles.subtitle}>
          Calendario y resumen de horas · {data.timezone}
        </Text>
        <Text style={styles.period}>
          {longDate(data.startDate)} – {longDate(data.endDate)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del periodo</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Horas previstas</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.plannedMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Horas reales</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.actualMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Diferencia</Text>
              <Text
                style={[styles.summaryValue, differenceStyle(summary.differenceMinutes)]}
              >
                {signedHours(summary.differenceMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Horas extra</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.overtimeMinutes)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Jornadas</Text>
              <Text style={styles.summaryValue}>{summary.shiftDays}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Descansos</Text>
              <Text style={styles.summaryValue}>{summary.restDays}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Días registrados</Text>
              <Text style={styles.summaryValue}>{summary.recordedDays}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Normal / Festivo</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.normalMinutes)} / {hours(summary.holidayMinutes)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Extra</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.extraMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Festivo-extra</Text>
              <Text style={styles.summaryValue}>
                {hours(summary.holidayExtraMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCell} />
            <View style={styles.summaryCell} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendario</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.summaryCell, styles.cellDate]}>Fecha</Text>
            <Text style={[styles.summaryCell, styles.cellWeekday]}>Día</Text>
            <Text style={[styles.summaryCell, styles.cellShift]}>Turno</Text>
            <Text style={[styles.summaryCell, styles.cellIntervals]}>
              Horario
            </Text>
            <Text style={[styles.summaryCell, styles.cellNumber]}>Prev.</Text>
            <Text style={[styles.summaryCell, styles.cellNumber]}>Real</Text>
            <Text style={[styles.summaryCell, styles.cellNumber]}>Dif.</Text>
            <Text style={[styles.summaryCell, styles.cellCategory]}>
              Categoría
            </Text>
          </View>
          {data.rows.map((row) => (
            <View key={row.date} style={styles.tableRow} wrap={false}>
              <Text style={[styles.summaryCell, styles.cellDate]}>
                {row.date}
              </Text>
              <Text style={[styles.summaryCell, styles.cellWeekday]}>
                {row.weekday}
              </Text>
              <Text style={[styles.summaryCell, styles.cellShift]}>
                {row.shift}
                {row.isHoliday ? " (festivo)" : ""}
              </Text>
              <Text style={[styles.summaryCell, styles.cellIntervals]}>
                {row.intervals || "—"}
              </Text>
              <Text style={[styles.summaryCell, styles.cellNumber]}>
                {hours(row.plannedMinutes)}
              </Text>
              <Text style={[styles.summaryCell, styles.cellNumber]}>
                {hours(row.actualMinutes)}
              </Text>
              <Text
                style={[
                  styles.summaryCell,
                  styles.cellNumber,
                  differenceStyle(row.differenceMinutes),
                ]}
              >
                {signedHours(row.differenceMinutes)}
              </Text>
              <Text style={[styles.summaryCell, styles.cellCategory]}>
                {row.category}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `ShiftManager · ${data.startDate} – ${data.endDate} · Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
