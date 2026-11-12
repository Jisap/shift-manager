"use client";

import { useState } from "react";
import { Calendar, Clock, DollarSign, PartyPopper, Sparkles, X } from "lucide-react";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayActualEditor } from "./DayActualEditor";
import { DayHolidayEditor } from "./DayHolidayEditor";
import { DayOvertimeEditor } from "./DayOvertimeEditor";
import { DayOverrideEditor } from "./DayOverrideEditor";
import { DayUnifiedEditor } from "./DayUnifiedEditor";

type Interval = { start: string; end: string };

type ExistingOverride = Doc<"scheduleOverrides">;

type ExistingActual = {
  actualStart?: number;
  actualEnd?: number;
  breakMinutes?: number;
  expectedMinutes?: number;
  notes?: string;
  overtimeMinutes?: number;
  isHoliday?: boolean;
};

type DayEditorSheetProps = {
  date: string;
  onClose: () => void;
  // Props para DayOverrideEditor
  shifts: Doc<"shiftTypes">[];
  selectedOverride?: ExistingOverride | null;
  // Props para DayActualEditor
  timezone: string;
  plannedMinutes: number;
  shiftTypeId?: Id<"shiftTypes">;
  shiftIntervals: Interval[];
  selectedOvertime?: ExistingActual;
  // Props para DayOvertimeEditor
  selectedShift?: Doc<"shiftTypes">;
  // Props para DayHolidayEditor
  selectedHolidays: Doc<"holidays">[];
};

type TabType = "unified" | "override" | "actual" | "overtime" | "holidays";

/**
 * Panel lateral (Sheet) que organiza la edición del día:
 * Por defecto ofrece el nuevo modo unificado (rápido y directo en 1 paso),
 * manteniendo las pestañas avanzadas para usuarios que deseen control granular de intervalos.
 */
export function DayEditorSheet({
  date,
  onClose,
  shifts,
  selectedOverride,
  timezone,
  plannedMinutes,
  shiftTypeId,
  shiftIntervals,
  selectedOvertime,
  selectedShift,
  selectedHolidays,
}: DayEditorSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>("unified");

  const tabs = [
    {
      id: "unified" as const,
      label: "Rápido (Unificado)",
      icon: Sparkles,
      activeDot: false,
    },
    {
      id: "override" as const,
      label: "Turno",
      icon: Calendar,
      activeDot: Boolean(selectedOverride),
    },
    {
      id: "actual" as const,
      label: "Fichaje manual",
      icon: Clock,
      activeDot: selectedOvertime?.actualStart !== undefined,
    },
    {
      id: "overtime" as const,
      label: "Horas extra",
      icon: DollarSign,
      activeDot: (selectedOvertime?.overtimeMinutes ?? 0) > 0,
    },
    {
      id: "holidays" as const,
      label: "Festivos",
      icon: PartyPopper,
      activeDot: selectedHolidays.length > 0,
    },
  ];

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-200">
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Gestión del día: <span className="text-primary font-mono">{date}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Modifica la planificación, fichaje real, horas extraordinarias o festivos.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar panel de edición"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex border-b border-border/60 bg-muted/20 px-4 sm:px-6">
        <div className="flex gap-2 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.activeDot ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    title="Contiene datos registrados"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenedor del formulario activo */}
      <div className="p-4 sm:p-6">
        {activeTab === "unified" && (
          <DayUnifiedEditor
            key={`${date}-unified`}
            date={date}
            onClose={onClose}
            shifts={shifts}
            selectedOverride={selectedOverride}
            timezone={timezone}
            plannedMinutes={plannedMinutes}
            shiftTypeId={shiftTypeId}
            shiftIntervals={shiftIntervals}
            selectedOvertime={selectedOvertime}
            selectedShift={selectedShift}
            selectedHolidays={selectedHolidays}
          />
        )}

        {activeTab === "override" && (
          <DayOverrideEditor
            key={`${date}-${selectedOverride?._id ?? "new"}`}
            date={date}
            shifts={shifts}
            existing={selectedOverride ?? undefined}
            onClose={onClose}
          />
        )}

        {activeTab === "actual" && (
          <DayActualEditor
            key={`${date}-actual-${selectedOvertime?.actualStart ?? "none"}-${selectedOvertime?.actualEnd ?? "none"}`}
            date={date}
            timezone={timezone}
            plannedMinutes={plannedMinutes}
            shiftTypeId={shiftTypeId}
            shiftIntervals={shiftIntervals}
            existing={selectedOvertime}
          />
        )}

        {activeTab === "overtime" && (
          <DayOvertimeEditor
            key={`${date}-${selectedOvertime?.overtimeMinutes ?? "none"}`}
            date={date}
            isHoliday={selectedHolidays.length > 0}
            shiftTypeId={shiftTypeId}
            shiftName={selectedShift?.name}
            shiftIntervals={shiftIntervals}
            existing={selectedOvertime}
          />
        )}

        {activeTab === "holidays" && (
          <DayHolidayEditor
            key={`${date}-holidays-${selectedHolidays.length}`}
            date={date}
            holidays={selectedHolidays}
          />
        )}
      </div>
    </div>
  );
}
