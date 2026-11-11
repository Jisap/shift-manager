import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton del Dashboard mientras cargan los datos del backend Convex.
 * Replica de forma idéntica la estructura de tarjetas y gráfico
 * para evitar cualquier salto de contenido (CLS).
 */
export function DashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-label="Cargando panel de estadísticas">
      {/* 2 tarjetas: Próximo turno y Próximo descanso */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 rounded-2xl shadow-2xs">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>

        <Card className="border-border/70 rounded-2xl shadow-2xs">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      </div>

      {/* Selector de periodo y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Grid de 4 tarjetas de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/70 rounded-2xl shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3.5 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tarjeta grande de Gráfico comparativo */}
      <Card className="border-border/70 rounded-2xl shadow-2xs">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
