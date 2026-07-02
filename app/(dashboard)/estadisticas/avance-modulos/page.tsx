"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { useGetAvanceModulosFiltrado } from "@/features/estadisticas/api/use-get-avance-modulos-filtrado"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { AvanceAgrupacionChart } from "@/features/estadisticas/components/avance-agrupacion-chart"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL = "__all__"
const SIN_MODULO = "__sin_modulo__"

interface NivelLike {
  id: string
  nombre: string
  posicion: number
}

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

export default function AvanceModulosEstadisticasPage() {
  const [sistemaId, setSistemaId] = useState("")
  const [nivelId, setNivelId] = useState("")
  const [especialidadId, setEspecialidadId] = useState("")
  const [compact, setCompact] = useState(false)

  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()

  const sistemas = sistemasRaw?.data ?? []
  const niveles: NivelLike[] = Array.isArray(nivelesRaw)
    ? (nivelesRaw as NivelLike[])
    : ((nivelesRaw as { data: NivelLike[] } | undefined)?.data ?? [])
  const especialidades = especialidadesRaw?.data ?? []

  const filtros = useMemo(
    () => ({
      sistemaId: sistemaId || undefined,
      nivelId: nivelId || undefined,
      especialidadId: especialidadId || undefined,
    }),
    [sistemaId, nivelId, especialidadId],
  )

  const { data, isLoading, error } = useGetAvanceModulosFiltrado(filtros)
  const items = data?.data ?? []

  const hasFilters = !!(sistemaId || nivelId || especialidadId)

  const { totalTareas, completadas, pctPromedio, totalElementos, cantidadModulos } = useMemo(() => {
    if (items.length === 0) return {
      totalTareas: 0, completadas: 0, pctPromedio: 0, totalElementos: 0, cantidadModulos: 0,
    }
    const totT = items.reduce((acc, x) => acc + x.totalTareas, 0)
    const totC = items.reduce((acc, x) => acc + x.completadas, 0)
    const totE = items.reduce((acc, x) => acc + x.cantidadElementos, 0)
    const pct = totT > 0 ? Math.round((totC / totT) * 1000) / 10 : 0
    // No cuenta la fila "Sin módulo" como un módulo.
    const cant = items.filter((x) => x.id !== SIN_MODULO).length
    return { totalTareas: totT, completadas: totC, pctPromedio: pct, totalElementos: totE, cantidadModulos: cant }
  }, [items])

  function clear() {
    setSistemaId("")
    setNivelId("")
    setEspecialidadId("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avance por módulos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          % de avance por módulo del proyecto. Un elemento pertenece a un solo módulo (o ninguno).
          Los elementos sin módulo aparecen en una fila especial <em>Sin módulo</em>.
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-44">
          <label className="text-xs font-medium text-gray-600">Sistema</label>
          <Select value={sistemaId || ALL} onValueChange={(v) => setSistemaId(v === ALL ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue>
                {sistemaId
                  ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "—"
                  : "Todos los sistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-44">
          <label className="text-xs font-medium text-gray-600">Nivel</label>
          <Select value={nivelId || ALL} onValueChange={(v) => setNivelId(v === ALL ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue>
                {nivelId
                  ? niveles.find((n) => n.id === nivelId)?.nombre ?? "—"
                  : "Todos los niveles"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los niveles</SelectItem>
              {[...niveles].sort((a, b) => a.posicion - b.posicion).map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-44">
          <label className="text-xs font-medium text-gray-600">Especialidad</label>
          <Select value={especialidadId || ALL} onValueChange={(v) => setEspecialidadId(v === ALL ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue>
                {especialidadId
                  ? especialidades.find((e) => e.id === especialidadId)?.nombre ?? "—"
                  : "Todas las especialidades"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las especialidades</SelectItem>
              {especialidades.map((esp) => (
                <SelectItem key={esp.id} value={esp.id}>
                  {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 ml-auto">
          <button
            type="button"
            onClick={() => setCompact(false)}
            className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
              !compact ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-600"
            }`}
          >
            Estándar
          </button>
          <button
            type="button"
            onClick={() => setCompact(true)}
            className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
              compact ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-600"
            }`}
          >
            Compacto
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Módulos
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {fmt(cantidadModulos)}
            </div>
            {items.some((x) => x.id === SIN_MODULO) && (
              <div className="text-xs text-muted-foreground">+ 1 fila &laquo;Sin módulo&raquo;</div>
            )}
          </div>
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Elementos
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {fmt(totalElementos)}
            </div>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tareas
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {fmt(completadas)} / {fmt(totalTareas)}
            </div>
            <div className="text-xs text-muted-foreground">Completadas / totales</div>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              % Promedio
            </div>
            <div className="text-2xl font-bold tabular-nums text-blue-900">
              {pctPromedio.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 animate-pulse h-96" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar el avance por módulo.
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
          <AvanceAgrupacionChart
            data={items}
            compact={compact}
            entityLabel="Módulo"
            emptyMessage="No hay módulos para mostrar con los filtros actuales. Creá módulos en Alcance → Módulos y asigná elementos."
          />
        </div>
      )}
    </div>
  )
}
