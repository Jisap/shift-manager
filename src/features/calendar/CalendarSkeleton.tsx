import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton del Calendario de turnos mientras se cargan los datos.
 * Modela la barra de navegación y la cuadrícula mensual de 7 columnas
 * con 5 filas para un aspecto 100% idéntico.
 */
export function CalendarSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-label="Cargando calendario de turnos">
      {/* Cabecera: selector de fecha, botones y pestañas de vista */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-6 w-36 rounded-md sm:w-44" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-8 w-14 rounded-lg" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-14 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Cuadrícula de 7 columnas */}
      <div className="space-y-1">
        {/* Nombres de los días de la semana */}
        <div className="grid grid-cols-7 gap-1 pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded-md" />
          ))}
        </div>

        {/* 5 semanas de celdas */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-20 sm:min-h-28 flex-col justify-between rounded-xl border border-border/40 p-2"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="size-4 rounded-md sm:block hidden" />
              </div>
              <div className="space-y-1 pt-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
