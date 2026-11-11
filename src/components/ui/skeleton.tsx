import { cn } from "@/lib/utils";

/**
 * Componente Skeleton de shadcn/ui.
 * Muestra una caja con pulso suave para reservar el espacio exacto
 * mientras se cargan datos asíncronos o estado de sesión.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}
