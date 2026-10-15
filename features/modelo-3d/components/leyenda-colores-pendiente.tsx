"use client"

import { COLOR_RESUELTOS, PALETA_PENDIENTES } from "../hooks/use-colores-por-pendiente"
import type { ColoresPorPendiente } from "../types"

interface Props {
  datos: ColoresPorPendiente | null
  loading?: boolean
}

/**
 * Leyenda del modo "Pendientes" — overlay del visor. Muestra un renglón por
 * categoría del punch, ordenadas de más a menos crítica (el backend ya las manda
 * así), con la cantidad de elementos y de pendientes abiertos de cada una.
 *
 * El criterio es "qué me impide arrancar": cada elemento se cuenta una sola vez,
 * en la categoría de su pendiente abierto más crítico. Por eso la suma de
 * elementos por categoría no da el total de pendientes.
 */
export function LeyendaColoresPendiente({ datos, loading }: Props) {
  const abiertos = datos?.totalPendientesAbiertos ?? 0
  const conPendientes = (datos?.buckets ?? []).reduce((a, b) => a + b.cantidadElementos, 0)

  return (
    <div className="pointer-events-none rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm text-xs space-y-2 min-w-60 max-w-76">
      <div className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">
        {loading ? "Cargando pendientes…" : "Pendientes por categoría"}
      </div>

      {datos && abiertos === 0 && !loading && (
        <p className="text-[11px] text-muted-foreground italic">
          No hay pendientes abiertos en el subset actual.
        </p>
      )}

      {datos && abiertos > 0 && (
        <div className="rounded-sm bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600 tabular-nums">
          <b>{conPendientes.toLocaleString("es-AR")}</b> elemento
          {conPendientes === 1 ? "" : "s"} con{" "}
          <b>{abiertos.toLocaleString("es-AR")}</b> pendiente
          {abiertos === 1 ? "" : "s"} abierto{abiertos === 1 ? "" : "s"}
        </div>
      )}

      <ul className="space-y-0.5">
        {(datos?.buckets ?? []).map((b, i) => (
          <Item
            key={b.categoriaId ?? b.categoriaNombre}
            color={hexColor(PALETA_PENDIENTES[Math.min(i, PALETA_PENDIENTES.length - 1)])}
            label={b.categoriaNombre}
            elementos={b.cantidadElementos}
            detalle={`${b.cantidadPendientes} pendiente${b.cantidadPendientes === 1 ? "" : "s"}`}
          />
        ))}
        {datos && datos.resueltos.cantidadElementos > 0 && (
          <Item
            color={hexColor(COLOR_RESUELTOS)}
            label="Resueltos"
            elementos={datos.resueltos.cantidadElementos}
            detalle="sin abiertos"
          />
        )}
      </ul>

      {datos && datos.sinPendientesElementos > 0 && (
        <p className="hidden sm:block text-[10px] text-muted-foreground leading-snug border-t pt-1.5">
          {datos.sinPendientesElementos.toLocaleString("es-AR")} elementos sin pendientes
          conservan su color original.
        </p>
      )}
    </div>
  )
}

function Item({
  color, label, elementos, detalle,
}: {
  color: string
  label: string
  elementos: number
  detalle: string
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-sm shrink-0 border border-black/10"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-700 truncate" title={label}>{label}</span>
      <span className="ml-auto shrink-0 text-gray-500 tabular-nums">
        <span className="hidden sm:inline text-[10px] mr-1.5">{detalle}</span>
        {elementos.toLocaleString("es-AR")}
      </span>
    </li>
  )
}

function hexColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`
}
