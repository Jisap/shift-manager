"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Edit3, Moon, MoreHorizontal, RotateCcw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type DayActionMenuProps = {
  date: string;
  hasOverride: boolean;
  overrideId?: Id<"scheduleOverrides">;
  shifts: Doc<"shiftTypes">[];
  onOpenEditor: () => void;
  className?: string;
};

export function DayActionMenu({
  date,
  hasOverride,
  overrideId,
  shifts,
  onOpenEditor,
  className,
}: DayActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setDayRestMutation = useMutation(api.overrides.setDayRest);
  const setDayShiftMutation = useMutation(api.overrides.setDayShift);
  const removeOverrideMutation = useMutation(api.overrides.remove);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSetRest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    try {
      await setDayRestMutation({ date });
    } catch {
      // Ignorar
    }
  };

  const handleRestorePattern = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (!overrideId) return;
    try {
      await removeOverrideMutation({ id: overrideId });
    } catch {
      // Ignorar
    }
  };

  const handleQuickShift = async (e: React.MouseEvent, shiftId: Id<"shiftTypes">) => {
    e.stopPropagation();
    setIsOpen(false);
    try {
      await setDayShiftMutation({
        date,
        shiftTypeId: shiftId,
      });
    } catch {
      // Fallback
    }
  };

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={`Acciones rápidas para el día ${date}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isOpen && "bg-muted text-foreground"
        )}
      >
        <MoreHorizontal className="size-3.5" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Poner en descanso */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSetRest}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
          >
            <Moon className="size-3.5 text-sky-500" />
            <span>Poner en descanso</span>
          </button>

          {/* Si tiene excepción, opción de restaurar */}
          {hasOverride && overrideId ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleRestorePattern}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
            >
              <RotateCcw className="size-3.5 text-amber-500" />
              <span>Restaurar al patrón</span>
            </button>
          ) : null}

          {/* Abrir editor completo */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onOpenEditor();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
          >
            <Edit3 className="size-3.5 text-primary" />
            <span>Editar detalles...</span>
          </button>

          {/* Accesos rápidos a turnos */}
          {shifts.length > 0 && (
            <div className="my-1 border-t border-border/50 pt-1">
              <span className="block px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                Asignar turno
              </span>
              <div className="max-h-28 overflow-y-auto">
                {shifts.slice(0, 6).map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    role="menuitem"
                    onClick={(e) => handleQuickShift(e, s._id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
