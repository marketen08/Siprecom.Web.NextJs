"use client"

import { useMemo } from "react"
import { CalendarClock, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"

import { useGetTimelinePreservacionElemento } from "../api/use-get-timeline-elemento"
import { ESTADO_ET, ESTADO_ET_LABEL, ESTADOS_ABIERTOS, type PreservacionCicloListItem } from "../types"

interface Props {
  elementoId: string | null
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const target = new Date(iso)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Timeline de ciclos de preservación agrupados por tarea. Se muestra dentro del
 * sheet de detalle del elemento. Cada tarea aparece con su cadena de ciclos
 * ordenada cronológicamente (por CicloNumero → FechaPlanificada). El backend ya
 * garantiza el orden — acá solo agrupamos por tareaId.
 *
 * Silencioso: si el elemento no tiene tareas de preservación, no renderiza nada.
 */
export function PreservacionTimeline({ elementoId }: Props) {
  const { data, isLoading } = useGetTimelinePreservacionElemento(elementoId)
  const ciclos = data?.data ?? []

  const grupos = useMemo(() => {
    const map = new Map<string, { tareaId: string; nombre: string; codigo: number; items: PreservacionCicloListItem[] }>()
    for (const c of ciclos) {
      const existing = map.get(c.tareaId)
      if (existing) existing.items.push(c)
      else map.set(c.tareaId, { tareaId: c.tareaId, nombre: c.tareaNombre, codigo: c.tareaCodigo, items: [c] })
    }
    return Array.from(map.values())
  }, [ciclos])

  if (isLoading) {
    return (
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Preservación
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando timeline...
        </div>
      </section>
    )
  }

  if (grupos.length === 0) return null

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5" />
        Preservación
      </h3>
      <div className="space-y-5">
        {grupos.map((g) => (
          <TareaTimeline key={g.tareaId} nombre={g.nombre} codigo={g.codigo} items={g.items} />
        ))}
      </div>
    </section>
  )
}

function TareaTimeline({
  nombre,
  codigo,
  items,
}: {
  nombre: string
  codigo: number
  items: PreservacionCicloListItem[]
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-800 px-1 mb-2">
        {nombre}
        <span className="ml-1.5 text-xs text-gray-400 font-normal">Cod. {codigo}</span>
      </h4>
      <ol className="relative border-l border-gray-200 ml-3 pl-4 space-y-2.5">
        {items.map((c) => (
          <CicloItem key={c.elementoTareaId} ciclo={c} />
        ))}
      </ol>
    </div>
  )
}

function CicloItem({ ciclo }: { ciclo: PreservacionCicloListItem }) {
  const abierto = ESTADOS_ABIERTOS.has(ciclo.estado)
  const dias = diasHasta(ciclo.fechaPlanificada)
  const vencido = abierto && dias != null && dias < 0

  const { icon, dotCls } =
    ciclo.estado === ESTADO_ET.APROBADO || ciclo.estado === ESTADO_ET.FIRMADO
      ? { icon: <CheckCircle2 className="h-3 w-3 text-green-700" />, dotCls: "bg-green-100 border-green-400" }
      : ciclo.estado === ESTADO_ET.RECHAZADO || ciclo.estado === ESTADO_ET.CANCELADO
        ? { icon: <XCircle className="h-3 w-3 text-red-700" />, dotCls: "bg-red-100 border-red-400" }
        : vencido
          ? { icon: <Clock className="h-3 w-3 text-red-700" />, dotCls: "bg-red-100 border-red-400" }
          : { icon: <Clock className="h-3 w-3 text-blue-700" />, dotCls: "bg-blue-100 border-blue-400" }

  return (
    <li className="relative">
      <span
        className={`absolute -left-[24px] top-0.5 flex items-center justify-center h-5 w-5 rounded-full border-2 ${dotCls}`}
      >
        {icon}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-800">
            {ciclo.cicloNumero > 0 ? `Ciclo #${ciclo.cicloNumero}` : "Ciclo inicial"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {ESTADO_ET_LABEL[ciclo.estado] ?? "—"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Planificado: <span className={vencido ? "text-red-700 font-medium" : ""}>{fmt(ciclo.fechaPlanificada)}</span>
            {ciclo.fechaTerminado && (
              <span className="ml-2">· Terminado: {fmt(ciclo.fechaTerminado)}</span>
            )}
          </p>
        </div>
        {ciclo.periodoSemanasEfectivo != null && ciclo.cicloNumero === 0 && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {ciclo.periodoSemanasEfectivo} sem.
          </span>
        )}
      </div>
    </li>
  )
}
