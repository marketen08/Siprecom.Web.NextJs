import { ESTADO_PROYECTO } from "@/features/proyectos/types"

/**
 * Color por estado de proyecto. Exportado para que los chips de los filtros usen
 * el mismo color que el badge de la tabla.
 */
export const ESTADO_COLORS: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-green-100 text-green-700",
  5: "bg-red-100 text-red-700",
  6: "bg-orange-100 text-orange-700",
  7: "bg-slate-100 text-slate-600",
}

/** Badge de estado del proyecto. Lo usan Configuración → Proyectos y Avance por proyectos. */
export function EstadoBadge({ estado }: { estado: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADO_COLORS[estado] ?? ""}`}
    >
      {ESTADO_PROYECTO[estado as keyof typeof ESTADO_PROYECTO] ?? estado}
    </span>
  )
}
