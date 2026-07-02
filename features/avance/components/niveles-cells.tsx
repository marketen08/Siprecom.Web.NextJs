import { CalendarClock } from "lucide-react"

import type { AvanceSubSistemaNivelDTO } from "../types"
import { diasHasta, fmtFecha, proximaMeta } from "../lib/niveles"

/**
 * Celda "Próxima meta" para grillas de sistemas/subsistemas. Muestra el primer nivel
 * pendiente + fecha fin con semáforo (vencido / próximo / a tiempo).
 */
export function ProximaMetaCelda({ niveles }: { niveles?: AvanceSubSistemaNivelDTO[] }) {
  const meta = proximaMeta(niveles)
  if (!meta) {
    if ((niveles?.length ?? 0) > 0) {
      return <span className="text-xs text-green-700 font-medium">Todos los niveles completos</span>
    }
    return <span className="text-xs text-muted-foreground">Sin planificación</span>
  }
  const dias = diasHasta(meta.fechaFin)
  let color = "text-gray-600 bg-gray-100"
  let etiqueta: string | null = null
  if (dias == null) {
    etiqueta = "Sin fecha"
  } else if (dias < 0) {
    color = "text-red-700 bg-red-100"
    etiqueta = `Vencido ${-dias}d`
  } else if (dias <= 15) {
    color = "text-amber-700 bg-amber-100"
    etiqueta = dias === 0 ? "Vence hoy" : `En ${dias}d`
  } else {
    color = "text-green-700 bg-green-100"
    etiqueta = `En ${dias}d`
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <CalendarClock className="h-4 w-4 text-gray-400 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate">{meta.nivelNombre}</div>
        <div className="text-xs text-muted-foreground truncate">
          {fmtFecha(meta.fechaFin)}
          {etiqueta && (
            <span className={`ml-1.5 inline-block rounded px-1.5 py-px text-[10px] font-semibold ${color}`}>
              {etiqueta}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Mini-tabla con el detalle de los niveles (fechas, avance, estado). Se usa dentro
 * de la fila expandida de la grilla de subsistemas/sistemas.
 */
export function NivelesDetalle({ niveles }: { niveles: AvanceSubSistemaNivelDTO[] }) {
  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="text-left px-3 py-1.5 font-semibold">Nivel</th>
            <th className="text-left px-3 py-1.5 font-semibold w-32">Inicio</th>
            <th className="text-left px-3 py-1.5 font-semibold w-32">Fin</th>
            <th className="text-left px-3 py-1.5 font-semibold w-48">Avance</th>
            <th className="text-left px-3 py-1.5 font-semibold w-24">Estado</th>
          </tr>
        </thead>
        <tbody>
          {niveles.map((n) => {
            const dias = diasHasta(n.fechaFin)
            const vencido = !n.completado && dias != null && dias < 0
            const proximo = !n.completado && dias != null && dias >= 0 && dias <= 15
            return (
              <tr key={n.nivelId} className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-medium text-gray-800">{n.nivelNombre}</td>
                <td className="px-3 py-1.5 text-gray-600">{fmtFecha(n.fechaInicio)}</td>
                <td className={`px-3 py-1.5 ${vencido ? "text-red-700 font-semibold" : proximo ? "text-amber-700 font-semibold" : "text-gray-600"}`}>
                  {fmtFecha(n.fechaFin)}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.min(100, Number(n.porcentajeAvance))}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-gray-700 w-12 text-right">
                      {Number(n.porcentajeAvance).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  {n.completado ? (
                    <span className="rounded bg-green-100 text-green-700 px-1.5 py-px text-[10px] font-semibold">Completo</span>
                  ) : n.totalTareas === 0 ? (
                    <span className="rounded bg-gray-100 text-gray-600 px-1.5 py-px text-[10px] font-semibold">Sin tareas</span>
                  ) : vencido ? (
                    <span className="rounded bg-red-100 text-red-700 px-1.5 py-px text-[10px] font-semibold">Vencido</span>
                  ) : proximo ? (
                    <span className="rounded bg-amber-100 text-amber-700 px-1.5 py-px text-[10px] font-semibold">Próximo</span>
                  ) : (
                    <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-px text-[10px] font-semibold">En curso</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
