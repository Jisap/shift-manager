import type { ReactNode } from "react";

/**
 * Plantilla raíz de Next.js (App Router).
 * A diferencia de layout.tsx (que persiste entre navegaciones),
 * template.tsx se desmonta y monta en cada cambio de ruta / página,
 * permitiendo ejecutar una animación suave y fluida de transición.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      {children}
    </div>
  );
}

