"use client"

import type { ColoresPorEstado } from "../types"

interface Props {
  buckets: ColoresPorEstado | null
  loading?: boolean
}

/**
 * Leyenda compacta de colores por estado del Elemento — overlay sobre el visor
 * cuando el toggle de colores está activo. Muestra los conteos por bucket y el
 * % de avance del subset filtrado. Cuando el usuario cambia los filtros del
 * visor (Sistema/SubSistema/Especialidad/Nivel), el backend recalcula y este
 * cuadro refleja el avance de lo que está en pantalla.
 */
export function LeyendaColoresEstado({ buckets, loading }: Props) {
  const pct = buckets?.porcentajeAvance ?? 0
  const total = buckets?.tareasTotal ?? 0
  const completadas = buckets?.tareasCompletadas ?? 0

  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm text-xs space-y-2 min-w-55">
      <div className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">
        {loading ? "Cargando estados…" : "Estado del Elemento"}
      </div>

      {/* Avance de tareas del subset filtrado. Si no hay tareas (filtro deja
          0 elementos / 0 tareas) lo decimos en vez de mostrar 0,0% que da
          falsa sensación de "todo pendiente". */}
      {buckets && (
        <div className="rounded-sm bg-gray-50 px-2 py-1.5 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Avance</span>
            <span className={`font-semibold tabular-nums ${pctColor(pct)}`}>
              {total > 0 ? `${pct.toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${pctBg(pct)} transition-all`}
              style={{ width: `${total > 0 ? pct : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 tabular-nums">
            {total > 0
              ? `${completadas.toLocaleString("es-AR")} / ${total.toLocaleString("es-AR")} tareas`
              : "Sin tareas en el filtro actual"}
          </div>
        </div>
      )}

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

function pctColor(pct: number): string {
  if (pct >= 100) return "text-green-700"
  if (pct >= 50)  return "text-blue-700"
  if (pct > 0)    return "text-amber-700"
  return "text-gray-500"
}

function pctBg(pct: number): string {
  if (pct >= 100) return "bg-green-500"
  if (pct >= 50)  return "bg-blue-500"
  if (pct > 0)    return "bg-amber-500"
  return "bg-gray-400"
}
