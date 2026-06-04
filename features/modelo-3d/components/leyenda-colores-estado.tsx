"use client"

import type { ColoresPorEstado } from "../types"

interface Props {
  buckets: ColoresPorEstado | null
  loading?: boolean
}

/**
 * Leyenda compacta de colores por estado del Elemento — overlay sobre el visor
 * cuando el toggle de colores está activo. Muestra los conteos por bucket.
 */
export function LeyendaColoresEstado({ buckets, loading }: Props) {
  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm text-xs space-y-1">
      <div className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">
        {loading ? "Cargando estados…" : "Estado del Elemento"}
      </div>
      <ul className="space-y-0.5">
        <Item color="#10b981" label="Completado"  count={buckets?.completados.length} />
        <Item color="#f59e0b" label="En curso"    count={buckets?.enCurso.length} />
        <Item color="#94a3b8" label="No iniciado" count={buckets?.noIniciados.length} />
        <Item color="#ef4444" label="Rechazado"   count={buckets?.rechazados.length} />
      </ul>
      <p className="text-[10px] text-muted-foreground italic pt-0.5">
        Las entidades sin Elemento vinculado mantienen su color original.
      </p>
    </div>
  )
}

function Item({ color, label, count }: { color: string; label: string; count?: number }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm border border-black/10"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-700">{label}</span>
      {typeof count === "number" && (
        <span className="ml-auto text-gray-500 tabular-nums">
          {count.toLocaleString("es-AR")}
        </span>
      )}
    </li>
  )
}
