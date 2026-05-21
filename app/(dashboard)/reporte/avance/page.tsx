"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react"

import {
  buildAvanceProyectoPdfUrl,
  useGetAvanceProyectoPreview,
} from "@/features/reportes/api/use-avance-proyecto"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import type {
  AvanceProyectoFiltros,
  AvanceProyectoNivel,
  AvanceProyectoSistema,
  AvanceProyectoSubSistema,
} from "@/features/reportes/types"

import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"

import { BarraAvance } from "@/components/barra-avance"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"

const ALL = "__all__"

function AvanceProyectoContent() {
  // Sincronización con URL: si la página se abre con ?subSistemaId=… o ?sistemaId=…
  // (caso de un deep-link desde otra página) los filtros se precargan.
  const router = useRouter()
  const sp = useSearchParams()
  const sistemaIdParam = sp.get("sistemaId") ?? ""
  const subSistemaIdParam = sp.get("subSistemaId") ?? ""

  const [nivelId, setNivelId] = useState<string>("")
  const [sistemaId, setSistemaId] = useState<string>(sistemaIdParam)
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam)
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    if (sistemaIdParam && sistemaId !== sistemaIdParam) setSistemaId(sistemaIdParam)
  }, [sistemaIdParam])
  useEffect(() => {
    if (subSistemaIdParam && subSistemaId !== subSistemaIdParam) setSubSistemaId(subSistemaIdParam)
  }, [subSistemaIdParam])

  function syncUrl(nextSistemaId: string, nextSubSistemaId: string) {
    const qs = new URLSearchParams()
    if (nextSistemaId) qs.set("sistemaId", nextSistemaId)
    if (nextSubSistemaId) qs.set("subSistemaId", nextSubSistemaId)
    const s = qs.toString()
    router.replace(s ? `/reporte/avance?${s}` : "/reporte/avance")
  }

  const sistemas         = useGetSistemasSelect().data?.data ?? []
  const todosSubSistemas = useGetSubSistemasSelect().data?.data ?? []
  const niveles          = (useGetNivelesSelect().data as { data?: Array<{ id: string; nombre: string; posicion: number }> })?.data ?? []
  const especialidades   = useGetEspecialidades().data?.data ?? []

  const subSistemasFiltrados = sistemaId
    ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId)
    : todosSubSistemas

  const filtros = useMemo<AvanceProyectoFiltros>(() => ({
    nivelId:        nivelId        || undefined,
    sistemaId:      sistemaId      || undefined,
    subSistemaId:   subSistemaId   || undefined,
    especialidadId: especialidadId || undefined,
  }), [nivelId, sistemaId, subSistemaId, especialidadId])

  const { data, isLoading, isFetching } = useGetAvanceProyectoPreview(filtros)
  const preview = data?.data

  function handleNivelChange(value: string | null) {
    setNivelId(!value || value === ALL ? "" : value)
  }
  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    let nextSub = subSistemaId
    if (id && subSistemaId) {
      const ss = todosSubSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) {
        nextSub = ""
        setSubSistemaId("")
      }
    }
    syncUrl(id, nextSub)
  }
  function handleSubSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSubSistemaId(id)
    syncUrl(sistemaId, id)
  }
  function handleEspecialidadChange(value: string | null) {
    setEspecialidadId(!value || value === ALL ? "" : value)
  }
  function handleClearFiltros() {
    setNivelId("")
    setSistemaId("")
    setSubSistemaId("")
    setEspecialidadId("")
    syncUrl("", "")
  }

  const nivelSel        = niveles.find((n) => n.id === nivelId)
  const sistemaSel      = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSel   = todosSubSistemas.find((ss) => ss.id === subSistemaId)
  const especialidadSel = especialidades.find((e) => e.id === especialidadId)

  const activeFilters: FilterChip[] = []
  if (nivelId) activeFilters.push({
    id: "nivel",
    label: `Nivel: ${nivelSel?.nombre ?? "—"}`,
    onRemove: () => setNivelId(""),
  })
  if (sistemaId) activeFilters.push({
    id: "sistema",
    label: `Sistema: ${sistemaSel ? `${sistemaSel.codigo} — ${sistemaSel.nombre}` : "—"}`,
    onRemove: () => handleSistemaChange(ALL),
  })
  if (subSistemaId) activeFilters.push({
    id: "subsistema",
    label: `Subsistema: ${subSistemaSel ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}` : "—"}`,
    onRemove: () => handleSubSistemaChange(ALL),
  })
  if (especialidadId) activeFilters.push({
    id: "especialidad",
    label: `Especialidad: ${especialidadSel?.nombre ?? "—"}`,
    onRemove: () => handleEspecialidadChange(ALL),
  })

  async function descargar() {
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf(buildAvanceProyectoPdfUrl(filtros), "avance-proyecto.pdf")
    } catch (e) {
      setDownloadError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avance del proyecto</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            % de avance por <strong>Nivel → Sistema → Subsistema</strong>. Vista ejecutiva: no
            desciende a elementos/tareas. PDF vertical, A4.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={descargar} disabled={downloading || isLoading} className="gap-2">
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
        </div>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

      <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={handleClearFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Nivel">
          <Select value={nivelId || ALL} onValueChange={handleNivelChange}>
            <SelectTrigger className="w-full">
              <SelectValue>{nivelSel?.nombre ?? "Todos los niveles"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los niveles</SelectItem>
              {niveles.map((n) => (
                <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Sistema">
          <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {sistemaSel
                  ? `${sistemaSel.codigo} — ${sistemaSel.nombre}`
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
        </FilterField>

        <FilterField label="Subsistema">
          <Select
            value={subSistemaId || ALL}
            onValueChange={handleSubSistemaChange}
            disabled={!!sistemaId && subSistemasFiltrados.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {subSistemaSel
                  ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}`
                  : "Todos los subsistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
              {subSistemasFiltrados.map((ss) => (
                <SelectItem key={ss.id} value={ss.id}>
                  {ss.codigo} — {ss.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Especialidad">
          <Select value={especialidadId || ALL} onValueChange={handleEspecialidadChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {especialidadSel?.nombre ?? "Todas las especialidades"}
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
        </FilterField>
      </FiltersSheet>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block" />
          <span className="ml-2">Cargando...</span>
        </div>
      ) : preview ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Subsistemas" value={preview.totalSubSistemas.toLocaleString("es-AR")} />
            <KpiCard label="Tareas" value={`${preview.tareasCompletadas.toLocaleString("es-AR")} / ${preview.totalTareas.toLocaleString("es-AR")}`} />
            <KpiCard
              label="% global del proyecto"
              value={`${preview.porcentajeGlobal.toFixed(1)}%`}
              valueColor={pctColor(preview.porcentajeGlobal)}
            />
          </div>
          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground">(actualizando...)</p>
          )}

          {preview.niveles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-muted-foreground">
              No hay tareas que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              {preview.niveles.map((nivel) => (
                <NivelSection key={nivel.nivelId ?? "sin-nivel"} nivel={nivel} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default function AvanceProyectoPage() {
  return (
    <Suspense>
      <AvanceProyectoContent />
    </Suspense>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueColor ?? "text-blue-900"}`}>{value}</div>
    </div>
  )
}

function NivelSection({ nivel }: { nivel: AvanceProyectoNivel }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="rounded-lg border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-blue-900 text-white px-4 py-2.5 flex items-center gap-2 hover:bg-blue-800 transition"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-semibold text-sm uppercase tracking-wide">Nivel · {nivel.nivelNombre}</span>
        <span className="ml-auto text-xs">
          <span className="font-semibold">{nivel.tareasCompletadas}</span>
          <span className="text-blue-200"> / {nivel.totalTareas} tareas  ·  </span>
          <span className="font-bold">{nivel.porcentajeAvance.toFixed(1)}%</span>
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-3">
          {nivel.sistemas.map((s) => (
            <SistemaSection key={s.sistemaId ?? "sin-sistema"} sistema={s} />
          ))}
        </div>
      )}
    </section>
  )
}

function SistemaSection({ sistema }: { sistema: AvanceProyectoSistema }) {
  return (
    <div className="border border-gray-100 rounded-md overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100">
        <div className="text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Sistema </span>
          <span className="font-mono font-semibold">{sistema.sistemaCodigo ?? "—"}</span>
          <span className="text-muted-foreground"> · {sistema.sistemaNombre ?? "—"}</span>
        </div>
        <div className="text-xs">
          <span className="font-semibold">{sistema.tareasCompletadas}</span>
          <span className="text-muted-foreground"> / {sistema.totalTareas}  ·  </span>
          <span className={`font-bold ${pctColor(sistema.porcentajeAvance)}`}>
            {sistema.porcentajeAvance.toFixed(1)}%
          </span>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-white text-gray-600">
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold px-3 py-1.5 w-28">Subsistema</th>
            <th className="text-left font-semibold px-3 py-1.5">Nombre</th>
            <th className="text-right font-semibold px-3 py-1.5 w-24">Tareas</th>
            <th className="text-left font-semibold px-3 py-1.5 w-56">Avance</th>
            <th className="text-right font-semibold px-3 py-1.5 w-14">%</th>
          </tr>
        </thead>
        <tbody>
          {sistema.subSistemas.map((ss) => (
            <SubSistemaRow key={ss.subSistemaId} sub={ss} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubSistemaRow({ sub }: { sub: AvanceProyectoSubSistema }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-1.5 font-mono text-[11px] text-gray-700">{sub.subSistemaCodigo ?? "—"}</td>
      <td className="px-3 py-1.5">{sub.subSistemaNombre ?? "—"}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
        {sub.tareasCompletadas} / {sub.totalTareas}
      </td>
      <td className="px-3 py-1.5">
        <BarraAvance porcentaje={Number(sub.porcentajeAvance)} showLabel={false} />
      </td>
      <td className={`px-3 py-1.5 text-right font-semibold ${pctColor(sub.porcentajeAvance)}`}>
        {sub.porcentajeAvance.toFixed(1)}%
      </td>
    </tr>
  )
}

function pctColor(pct: number): string {
  if (pct >= 100) return "text-green-700"
  if (pct >= 50) return "text-blue-700"
  if (pct > 0) return "text-amber-700"
  return "text-gray-500"
}
