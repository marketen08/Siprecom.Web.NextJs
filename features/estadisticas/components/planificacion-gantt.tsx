"use client"

import Link from "next/link"
import { Fragment } from "react"

import { fmtFecha } from "@/features/avance/lib/niveles"
import { estadoDeBarra, ticksMensuales, xDeFecha, type EstadoBarra, type GanttFila } from "../lib/gantt"

interface Props {
  filas: GanttFila[]
  desde: Date
  hasta: Date
}

const COLOR_BARRA: Record<EstadoBarra, { fondo: string; texto: string; label: string }> = {
  completado: { fondo: "bg-green-600",  texto: "text-green-700",  label: "Completo" },
  vencido:    { fondo: "bg-red-600",    texto: "text-red-700",    label: "Vencido" },
  proximo:    { fondo: "bg-amber-500",  texto: "text-amber-700",  label: "Próximo" },
  en_curso:   { fondo: "bg-blue-600",   texto: "text-blue-700",   label: "En curso" },
  futuro:     { fondo: "bg-gray-400",   texto: "text-gray-600",   label: "Futuro" },
}

/**
 * Agrupamos por (sistema, subsistema) para dibujar un sub-header y no repetir el
 * código+nombre en cada nivel. Ordenamos por sistema.codigo → subsistema.codigo →
 * nivel.posicion.
 */
function agrupar(filas: GanttFila[]) {
  const ordenadas = [...filas].sort((a, b) => {
    if (a.sistemaCodigo !== b.sistemaCodigo) return a.sistemaCodigo.localeCompare(b.sistemaCodigo)
    if (a.subSistemaCodigo !== b.subSistemaCodigo) return a.subSistemaCodigo.localeCompare(b.subSistemaCodigo)
    return a.nivelPosicion - b.nivelPosicion
  })
  const grupos: Array<{ key: string; sistema: string; subSistema: GanttFila; niveles: GanttFila[] }> = []
  for (const f of ordenadas) {
    const key = `${f.sistemaId}::${f.subSistemaId}`
    let g = grupos.find((x) => x.key === key)
    if (!g) {
      g = { key, sistema: `${f.sistemaCodigo} — ${f.sistemaNombre}`, subSistema: f, niveles: [] }
      grupos.push(g)
    }
    g.niveles.push(f)
  }
  return grupos
}

export function PlanificacionGantt({ filas, desde, hasta }: Props) {
  const grupos = agrupar(filas)
  const ticks = ticksMensuales(desde, hasta)
  const hoy = new Date()
  const hoyX = xDeFecha(hoy.toISOString(), desde, hasta)

  if (grupos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
        No hay subsistemas planificados para los filtros actuales.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Header con meses */}
      <div className="flex items-stretch border-b bg-gray-50">
        <div className="w-72 shrink-0 border-r px-3 py-2 text-xs font-semibold text-gray-700">
          Subsistema · Nivel
        </div>
        <div className="flex-1 relative h-9 min-w-0">
          {ticks.map((t) => (
            <div key={t.key} className="absolute inset-y-0" style={{ left: `${t.leftPct}%` }}>
              <div className="h-full border-l border-gray-200" />
              <div className="absolute top-1 left-1 text-[10px] text-gray-500 whitespace-nowrap">
                {t.label}
              </div>
            </div>
          ))}
          {hoyX != null && (
            <div className="absolute inset-y-0 border-l-2 border-blue-600" style={{ left: `${hoyX}%` }}>
              <div className="absolute -top-0.5 left-0.5 text-[10px] font-semibold text-blue-700">
                hoy
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filas agrupadas por subsistema */}
      <div>
        {grupos.map((g, gi) => (
          <Fragment key={g.key}>
            {/* Header del grupo — muestra sistema una sola vez si es el primero del sistema */}
            {(gi === 0 || grupos[gi - 1].niveles[0].sistemaId !== g.niveles[0].sistemaId) && (
              <div className="bg-gray-100 border-b px-3 py-1 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                {g.sistema}
              </div>
            )}
            {g.niveles.map((n, i) => (
              <div key={`${g.key}-${n.nivelId}`} className="flex border-b last:border-b-0 hover:bg-blue-50/40">
                <div className="w-72 shrink-0 border-r px-3 py-2">
                  {i === 0 ? (
                    <Link
                      href={`/ejecucion/subsistemas/${g.subSistema.subSistemaId}`}
                      className="block group"
                    >
                      <div className="font-mono text-xs text-gray-800 group-hover:text-blue-700">
                        {g.subSistema.subSistemaCodigo}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {g.subSistema.subSistemaNombre}
                      </div>
                    </Link>
                  ) : (
                    <div className="h-0" aria-hidden />
                  )}
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">
                    {n.nivelNombre}
                  </div>
                </div>
                <div className="flex-1 relative h-11 min-w-0">
                  {/* Líneas verticales de meses en el fondo */}
                  {ticks.map((t) => (
                    <div
                      key={t.key}
                      className="absolute inset-y-0 border-l border-gray-100"
                      style={{ left: `${t.leftPct}%` }}
                    />
                  ))}
                  {/* Línea de hoy */}
                  {hoyX != null && (
                    <div
                      className="absolute inset-y-0 border-l-2 border-blue-600/60"
                      style={{ left: `${hoyX}%` }}
                    />
                  )}
                  {/* Barra del nivel */}
                  <BarraGantt fila={n} desde={desde} hasta={hasta} />
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-3 flex-wrap border-t bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
        <span className="font-semibold">Estado:</span>
        {(["completado", "en_curso", "proximo", "vencido", "futuro"] as EstadoBarra[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={`inline-block h-3 w-4 rounded ${COLOR_BARRA[k].fondo}`} />
            {COLOR_BARRA[k].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 ml-3">
          <span className="inline-block h-3 w-0.5 bg-blue-600" />
          Hoy
        </span>
      </div>
    </div>
  )
}

function BarraGantt({
  fila, desde, hasta,
}: {
  fila: GanttFila; desde: Date; hasta: Date
}) {
  const xInicio = xDeFecha(fila.fechaInicio, desde, hasta)
  const xFin = xDeFecha(fila.fechaFin, desde, hasta)
  // Si no hay inicio pero sí fin (o viceversa), dibujamos un punto en la fecha conocida.
  if (xInicio == null && xFin == null) return null
  const x0 = xInicio ?? xFin!
  const x1 = xFin ?? xInicio!
  const ancho = Math.max(0.6, x1 - x0) // mínimo 0.6% para que se vea
  const estado = estadoDeBarra(fila)
  const c = COLOR_BARRA[estado]
  const pctInterno = Math.max(0, Math.min(100, fila.porcentajeAvance))

  const tooltip = `${fila.nivelNombre}\n` +
    `${fmtFecha(fila.fechaInicio)} → ${fmtFecha(fila.fechaFin)}\n` +
    `Avance: ${pctInterno.toFixed(0)}% (${fila.tareasTerminales}/${fila.totalTareas})`

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded overflow-hidden border border-black/10 shadow-sm"
      style={{ left: `${x0}%`, width: `${ancho}%`, height: 20 }}
      title={tooltip}
    >
      {/* Fondo "planificado" — gris claro */}
      <div className="absolute inset-0 bg-gray-200" />
      {/* Progreso real — teñido por estado */}
      <div className={`absolute inset-y-0 left-0 ${c.fondo}`} style={{ width: `${pctInterno}%` }} />
      {/* Label con % si la barra es lo bastante ancha */}
      {ancho > 4 && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white drop-shadow-sm">
          {pctInterno.toFixed(0)}%
        </div>
      )}
    </div>
  )
}
