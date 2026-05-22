"use client"

import { useMemo, useState } from "react"
import { FileDown, Loader2, X } from "lucide-react"

import { useGetAvanceSubsistemasFiltrado } from "@/features/estadisticas/api/use-get-avance-subsistemas-filtrado"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { AvanceSubsistemasChart } from "@/features/estadisticas/components/avance-subsistemas-chart"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL = "__all__"

interface NivelLike {
  id: string
  nombre: string
  posicion: number
}

function fmt(n: number) {
  return n.toLocaleString("es-AR")
}

export default function AvanceSubsistemasPage() {
  const [sistemaId, setSistemaId] = useState("")
  const [nivelId, setNivelId] = useState("")
  const [especialidadId, setEspecialidadId] = useState("")
  const [compact, setCompact] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()

  const sistemas = sistemasRaw?.data ?? []
  // useGetNivelesSelect devuelve el shape sin envolver — soportamos ambos por compat.
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

  const { data, isLoading, error } = useGetAvanceSubsistemasFiltrado(filtros)
  const items = data?.data ?? []

  const hasFilters = !!(sistemaId || nivelId || especialidadId)

  // KPIs derivados del subset visible.
  const { totalTareas, completadas, pctPromedio } = useMemo(() => {
    if (items.length === 0) return { totalTareas: 0, completadas: 0, pctPromedio: 0 }
    const totT = items.reduce((acc, x) => acc + x.totalTareas, 0)
    const totC = items.reduce((acc, x) => acc + x.completadas, 0)
    // % promedio "real": completadas / total (no promedio aritmético de %s, que sesgaría
    // subsistemas chicos).
    const pct = totT > 0 ? Math.round((totC / totT) * 1000) / 10 : 0
    return { totalTareas: totT, completadas: totC, pctPromedio: pct }
  }, [items])

  function clear() {
    setSistemaId("")
    setNivelId("")
    setEspecialidadId("")
  }

  async function exportarPdf() {
    if (downloading) return
    setDownloadError(null)
    setDownloading(true)
    try {
      const qs = new URLSearchParams()
      if (sistemaId) qs.set("sistemaId", sistemaId)
      if (nivelId) qs.set("nivelId", nivelId)
      if (especialidadId) qs.set("especialidadId", especialidadId)
      const url = "/api/reportes/avance-subsistemas/pdf"
        + (qs.toString() ? `?${qs.toString()}` : "")
      await downloadPdf(url, "avance-subsistemas.pdf")
    } catch (e) {
      setDownloadError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avance por subsistemas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            % de avance por subsistema. Los filtros de Nivel y Especialidad recalculan el %
            considerando solo las tareas que matchean.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportarPdf}
          disabled={downloading}
          className="gap-2 shrink-0"
        >
          {downloading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <FileDown className="h-4 w-4" />}
          {downloading ? "Generando..." : "Exportar PDF"}
        </Button>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

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

        {/* Segmented control compacto / estándar */}
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

      {/* KPIs del subset filtrado */}
      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subsistemas
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {fmt(items.length)}
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
            <div className="text-xs text-muted-foreground">Sobre el universo filtrado</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 animate-pulse h-96" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar el avance por subsistema.
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
          <AvanceSubsistemasChart data={items} compact={compact} />
        </div>
      )}
    </div>
  )
}
