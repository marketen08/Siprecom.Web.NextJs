"use client"

import { useMemo, useState } from "react"
import { CalendarRange, Loader2 } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"
import { PlanificacionGantt } from "@/features/estadisticas/components/planificacion-gantt"
import { calcularRango, estadoDeBarra, proyectoToGanttFilas } from "@/features/estadisticas/lib/gantt"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const ALL = "__all__"

interface NivelLike { id: string; nombre: string; posicion: number }

export default function PlanificacionGanttPage() {
  const { data: perfil } = useGetPerfil()
  const { data: proyectoData, isLoading } = useGetAvanceProyecto(perfil?.proyectoId)
  const { data: sistemasData } = useGetSistemasSelect()
  const { data: nivelesData } = useGetNivelesUsadosSelect()

  const sistemas = sistemasData?.data ?? []
  const niveles = ((nivelesData as any)?.data ?? []) as NivelLike[]

  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [soloDesvios, setSoloDesvios] = useState(false)

  const filas = useMemo(() => proyectoToGanttFilas(proyectoData?.data), [proyectoData])

  const filasFiltradas = useMemo(() => {
    let out = filas
    if (sistemaId !== ALL) out = out.filter((f) => f.sistemaId === sistemaId)
    if (nivelId !== ALL) out = out.filter((f) => f.nivelId === nivelId)
    if (soloDesvios) out = out.filter((f) => estadoDeBarra(f) === "vencido" || estadoDeBarra(f) === "proximo")
    return out
  }, [filas, sistemaId, nivelId, soloDesvios])

  const rango = useMemo(() => calcularRango(filasFiltradas.length ? filasFiltradas : filas), [filasFiltradas, filas])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-5 w-5 text-blue-700" />
        <h1 className="text-lg font-semibold">Planificación (Gantt)</h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-4xl">
        Vista temporal de las ventanas planificadas por subsistema × nivel. Cada barra
        muestra el rango <strong>FechaInicio → FechaFin</strong>; el color indica el
        estado (vencido, próximo, en curso, completo) y el % pintado es el avance real
        de las tareas de ese nivel.
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sistemaId} onValueChange={(v) => setSistemaId(v ?? ALL)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos los sistemas">
              {(() => {
                if (sistemaId === ALL) return "Todos los sistemas"
                const s = sistemas.find((x) => x.id === sistemaId)
                return s ? `${s.codigo} — ${s.nombre}` : "Todos los sistemas"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los sistemas</SelectItem>
            {sistemas.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={nivelId} onValueChange={(v) => setNivelId(v ?? ALL)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos los niveles">
              {(() => {
                if (nivelId === ALL) return "Todos los niveles"
                const n = niveles.find((x) => x.id === nivelId)
                return n?.nombre ?? "Todos los niveles"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los niveles</SelectItem>
            {niveles
              .slice()
              .sort((a, b) => a.posicion - b.posicion)
              .map((n) => (
                <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={soloDesvios}
            onChange={(e) => setSoloDesvios(e.target.checked)}
            className="h-4 w-4 accent-blue-900"
          />
          Solo con desvío (vencido o próximo)
        </label>

        <span className="ml-auto text-xs text-muted-foreground">
          {filasFiltradas.length} de {filas.length} filas
        </span>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
        </div>
      ) : !rango ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
          No hay subsistemas con fechas planificadas en este proyecto.
        </div>
      ) : (
        <PlanificacionGantt filas={filasFiltradas} desde={rango.desde} hasta={rango.hasta} />
      )}
    </div>
  )
}
