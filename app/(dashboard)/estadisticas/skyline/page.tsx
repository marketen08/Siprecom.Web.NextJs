"use client"

import { useMemo, useState } from "react"
import { BarChart3, Loader2 } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"
import { SkylineChart } from "@/features/estadisticas/components/skyline-chart"
import {
  calcularRango, estadoDeBarra, filasToSkyline, proyectoToGanttFilas,
  type Granularidad,
} from "@/features/estadisticas/lib/gantt"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const ALL = "__all__"

interface NivelLike { id: string; nombre: string; posicion: number }

export default function SkylinePage() {
  const { data: perfil } = useGetPerfil()
  const { data: proyectoData, isLoading } = useGetAvanceProyecto(perfil?.proyectoId)
  const { data: sistemasData } = useGetSistemasSelect()
  const { data: nivelesData } = useGetNivelesUsadosSelect()

  const sistemas = sistemasData?.data ?? []
  const niveles = ((nivelesData as any)?.data ?? []) as NivelLike[]

  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [granularidad, setGranularidad] = useState<Granularidad>("mes")

  const filas = useMemo(() => proyectoToGanttFilas(proyectoData?.data), [proyectoData])

  const filasFiltradas = useMemo(() => {
    let out = filas
    if (sistemaId !== ALL) out = out.filter((f) => f.sistemaId === sistemaId)
    if (nivelId !== ALL) out = out.filter((f) => f.nivelId === nivelId)
    return out
  }, [filas, sistemaId, nivelId])

  const rango = useMemo(() => calcularRango(filasFiltradas.length ? filasFiltradas : filas), [filasFiltradas, filas])
  const buckets = useMemo(
    () => (rango ? filasToSkyline(filasFiltradas, granularidad, rango) : []),
    [filasFiltradas, granularidad, rango],
  )

  // KPIs — cuadran con las barras.
  const kpis = useMemo(() => {
    const c = { completado: 0, en_curso: 0, proximo: 0, vencido: 0, futuro: 0 }
    for (const f of filasFiltradas) {
      c[estadoDeBarra(f)] += 1
    }
    return c
  }, [filasFiltradas])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-700" />
        <h1 className="text-lg font-semibold">Skyline — carga programada</h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-4xl">
        Distribución de hitos <strong>FechaFin</strong> por mes (o semana). Cada
        columna muestra cuántos combos <em>subsistema × nivel</em> terminan en ese
        período, coloreados por su estado real (completo, en curso, próximo,
        vencido, futuro). Sirve para dimensionar recursos y ver picos de trabajo.
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
            {niveles.slice().sort((a, b) => a.posicion - b.posicion).map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={granularidad} onValueChange={(v) => setGranularidad((v as Granularidad) ?? "mes")}>
          <SelectTrigger className="w-40">
            <SelectValue>{granularidad === "mes" ? "Por mes" : "Por semana"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Por mes</SelectItem>
            <SelectItem value="semana">Por semana</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {filasFiltradas.length} de {filas.length} combos
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Kpi label="Completos"  value={kpis.completado} color="text-green-700 bg-green-50 border-green-200" />
        <Kpi label="En curso"   value={kpis.en_curso}   color="text-blue-700 bg-blue-50 border-blue-200" />
        <Kpi label="Próximos"   value={kpis.proximo}    color="text-amber-700 bg-amber-50 border-amber-200" />
        <Kpi label="Vencidos"   value={kpis.vencido}    color="text-red-700 bg-red-50 border-red-200" />
        <Kpi label="Futuros"    value={kpis.futuro}     color="text-gray-700 bg-gray-50 border-gray-200" />
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
        <SkylineChart buckets={buckets} granularidadLabel={granularidad === "mes" ? "mes" : "semana"} />
      )}
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${color}`}>
      <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70">{label}</div>
      <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
    </div>
  )
}
