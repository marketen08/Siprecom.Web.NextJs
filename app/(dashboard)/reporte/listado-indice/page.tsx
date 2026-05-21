"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react"

import {
  buildListadoIndicePdfUrl,
  useGetListadoIndicePreview,
} from "@/features/reportes/api/use-listado-indice"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import type {
  ListadoIndiceElemento,
  ListadoIndiceEspecialidadGrupo,
  ListadoIndiceFiltros,
  ListadoIndiceNivelGrupo,
  ListadoIndiceSistemaGrupo,
  ListadoIndiceSubSistemaGrupo,
  ListadoIndiceTarea,
} from "@/features/reportes/types"

import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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

const ESTADO_BADGE_CLASES: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",       // PENDIENTE
  2: "bg-amber-100 text-amber-800",     // EN_PROCESO
  3: "bg-blue-100 text-blue-800",       // COMPLETADO
  4: "bg-green-100 text-green-800",     // APROBADO
  5: "bg-red-100 text-red-700",         // RECHAZADO
  7: "bg-emerald-100 text-emerald-800", // FIRMADO
}

function ListadoIndiceContent() {
  // Sincronización con URL: si la página se abre con ?subSistemaId=… (caso del dropdown
  // de /ejecucion/subsistemas) o ?sistemaId=…, los filtros se precargan. Cambios manuales
  // en sistema/subsistema también se reflejan en la URL para que se puedan compartir.
  const router = useRouter()
  const sp = useSearchParams()
  const sistemaIdParam = sp.get("sistemaId") ?? ""
  const subSistemaIdParam = sp.get("subSistemaId") ?? ""

  const [nivelId, setNivelId] = useState<string>("")
  const [sistemaId, setSistemaId] = useState<string>(sistemaIdParam)
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam)
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Sync incoming URL params si cambian (back/forward del browser).
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
    router.replace(s
      ? `/reporte/listado-indice?${s}`
      : "/reporte/listado-indice")
  }

  // Catálogos
  const sistemas       = useGetSistemasSelect().data?.data ?? []
  const todosSubSistemas = useGetSubSistemasSelect().data?.data ?? []
  const niveles        = (useGetNivelesSelect().data as { data?: Array<{ id: string; nombre: string; posicion: number }> })?.data ?? []
  const especialidades = useGetEspecialidades().data?.data ?? []
  const tipos          = useGetElementosTiposSelect().data?.data ?? []

  const subSistemasFiltrados = sistemaId
    ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId)
    : todosSubSistemas

  const tipoOptions = useMemo(() => {
    const filtrados = especialidadId
      ? tipos.filter((t) => t.especialidadId === especialidadId)
      : tipos
    return [
      { value: "", label: "Todos los tipos" },
      ...filtrados.map((t) => ({ value: t.id, label: t.nombre })),
    ]
  }, [tipos, especialidadId])

  const filtros = useMemo<ListadoIndiceFiltros>(() => ({
    nivelId:        nivelId        || undefined,
    sistemaId:      sistemaId      || undefined,
    subSistemaId:   subSistemaId   || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
  }), [nivelId, sistemaId, subSistemaId, especialidadId, elementoTipoId])

  const { data, isLoading, isFetching } = useGetListadoIndicePreview(filtros)
  const preview = data?.data

  // Handlers de cambio con cascading (sistema→subsistema, especialidad→tipo) y URL sync.
  function handleNivelChange(value: string | null) {
    setNivelId(!value || value === ALL ? "" : value)
  }
  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    // Si el subsistema actual no pertenece al nuevo sistema, lo limpiamos.
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
    const v = !value || value === ALL ? "" : value
    setEspecialidadId(v)
    if (v && elementoTipoId) {
      const tipo = tipos.find((t) => t.id === elementoTipoId)
      if (tipo?.especialidadId !== v) setElementoTipoId("")
    }
  }
  function handleClearFiltros() {
    setNivelId("")
    setSistemaId("")
    setSubSistemaId("")
    setEspecialidadId("")
    setElementoTipoId("")
    syncUrl("", "")
  }

  // Activos para chips
  const nivelSel        = niveles.find((n) => n.id === nivelId)
  const sistemaSel      = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSel   = todosSubSistemas.find((ss) => ss.id === subSistemaId)
  const especialidadSel = especialidades.find((e) => e.id === especialidadId)
  const tipoSel         = tipos.find((t) => t.id === elementoTipoId)

  const activeFilters: FilterChip[] = []
  if (nivelId) {
    activeFilters.push({
      id: "nivel",
      label: `Nivel: ${nivelSel?.nombre ?? "—"}`,
      onRemove: () => setNivelId(""),
    })
  }
  if (sistemaId) {
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${sistemaSel ? `${sistemaSel.codigo} — ${sistemaSel.nombre}` : "—"}`,
      onRemove: () => handleSistemaChange(ALL),
    })
  }
  if (subSistemaId) {
    activeFilters.push({
      id: "subsistema",
      label: `Subsistema: ${subSistemaSel ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}` : "—"}`,
      onRemove: () => handleSubSistemaChange(ALL),
    })
  }
  if (especialidadId) {
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${especialidadSel?.nombre ?? "—"}`,
      onRemove: () => handleEspecialidadChange(ALL),
    })
  }
  if (elementoTipoId) {
    activeFilters.push({
      id: "tipo",
      label: `Tipo: ${tipoSel?.nombre ?? "—"}`,
      onRemove: () => setElementoTipoId(""),
    })
  }

  async function descargar() {
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf(buildListadoIndicePdfUrl(filtros), "listado-indice.pdf")
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
          <h1 className="text-2xl font-bold text-gray-900">Listado índice de tareas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista anidada de todas las tareas del proyecto agrupadas por <strong>Nivel → Sistema → Subsistema → Especialidad</strong>.
            Filtrá lo que necesites y descargá el PDF (vertical, A4).
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

        <FilterField label="Tipo de elemento">
          <Combobox
            options={tipoOptions}
            value={elementoTipoId}
            onChange={(v) => setElementoTipoId(v)}
            placeholder="Todos los tipos"
            searchPlaceholder="Buscar tipo..."
            emptyMessage="Sin resultados"
          />
        </FilterField>
      </FiltersSheet>

      {/* KPIs + preview */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block" />
          <span className="ml-2">Cargando...</span>
        </div>
      ) : preview ? (
        <>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span><strong className="text-gray-900">{preview.totalElementos.toLocaleString("es-AR")}</strong> elementos</span>
            <span><strong className="text-gray-900">{preview.totalTareas.toLocaleString("es-AR")}</strong> tareas</span>
            {isFetching && !isLoading && <span className="text-xs">(actualizando...)</span>}
          </div>

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

export default function ListadoIndicePage() {
  return (
    <Suspense>
      <ListadoIndiceContent />
    </Suspense>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function NivelSection({ nivel }: { nivel: ListadoIndiceNivelGrupo }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="rounded-lg border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-blue-900 text-white px-4 py-2 flex items-center gap-2 hover:bg-blue-800 transition"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-semibold text-sm uppercase tracking-wide">Nivel · {nivel.nivelNombre}</span>
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

function SistemaSection({ sistema }: { sistema: ListadoIndiceSistemaGrupo }) {
  return (
    <div className="border border-gray-100 rounded-md">
      <div className="bg-gray-50 px-3 py-2 text-sm border-b border-gray-100">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Sistema </span>
        <span className="font-mono font-semibold">{sistema.sistemaCodigo ?? "—"}</span>
        <span className="text-muted-foreground"> · {sistema.sistemaNombre ?? "—"}</span>
      </div>
      <div className="p-2 space-y-2">
        {sistema.subSistemas.map((ss) => (
          <SubSistemaSection key={ss.subSistemaId} sub={ss} />
        ))}
      </div>
    </div>
  )
}

function SubSistemaSection({ sub }: { sub: ListadoIndiceSubSistemaGrupo }) {
  return (
    <div className="border border-gray-100 rounded-md">
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="font-mono font-semibold">{sub.subSistemaCodigo ?? "—"}</span>
          <span className="text-muted-foreground"> · {sub.subSistemaNombre ?? "—"}</span>
        </div>
        <div className="text-xs">
          <span className="font-semibold text-green-700">{sub.tareasCompletadas}</span>
          <span className="text-muted-foreground"> completadas · </span>
          <span className="font-semibold text-amber-700">{sub.tareasPendientes}</span>
          <span className="text-muted-foreground"> pendientes</span>
        </div>
      </div>
      <div className="p-2 space-y-2">
        {sub.especialidades.map((esp) => (
          <EspecialidadSection key={esp.especialidadId ?? "sin-esp"} esp={esp} />
        ))}
      </div>
    </div>
  )
}

function EspecialidadSection({ esp }: { esp: ListadoIndiceEspecialidadGrupo }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1 text-xs">
        {esp.especialidadColor && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: esp.especialidadColor }}
          />
        )}
        <span className="font-semibold text-gray-700">{esp.especialidadNombre ?? "—"}</span>
        <span className="text-muted-foreground">· {esp.elementos.length} elemento(s)</span>
      </div>
      <div className="rounded-md border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-2 py-1.5 w-24">TAG</th>
              <th className="text-left font-semibold px-2 py-1.5">Elemento</th>
              <th className="text-right font-semibold px-2 py-1.5 w-14">%</th>
              <th className="text-left font-semibold px-2 py-1.5">Tareas</th>
            </tr>
          </thead>
          <tbody>
            {esp.elementos.map((el) => (
              <ElementoRow key={el.elementoId} el={el} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ElementoRow({ el }: { el: ListadoIndiceElemento }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-2 py-1.5 font-mono text-[11px] text-gray-700">{el.tag ?? "—"}</td>
      <td className="px-2 py-1.5">{el.nombre ?? "—"}</td>
      <td className={`px-2 py-1.5 text-right font-semibold ${pctColor(el.porcentajeAvance)}`}>
        {el.porcentajeAvance.toFixed(1)}%
      </td>
      <td className="px-2 py-1.5">
        <div className="flex flex-col gap-1">
          {el.tareas.map((t) => <TareaPill key={t.elementoTareaId} t={t} />)}
        </div>
      </td>
    </tr>
  )
}

function TareaPill({ t }: { t: ListadoIndiceTarea }) {
  const cls = ESTADO_BADGE_CLASES[t.estado] ?? "bg-gray-100 text-gray-700"
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-gray-700 truncate">{t.tareaNombre ?? "—"}</span>
      <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] shrink-0 ${cls}`}>
        {t.estadoTexto ?? "—"}
      </span>
    </div>
  )
}

function pctColor(pct: number): string {
  if (pct >= 100) return "text-green-700"
  if (pct >= 50) return "text-blue-700"
  if (pct > 0) return "text-amber-700"
  return "text-gray-500"
}
