"use client"

import { useMemo, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Download, FileText, Loader2, X } from "lucide-react"

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

import { useGetSistemas } from "@/features/sistemas/api/use-get-sistemas"
import { useGetSubSistemas } from "@/features/subsistemas/api/use-get-subsistemas"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetElementosTipos } from "@/features/elementostipos/api/use-get-elementostipos"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const ALL = "_all"

const ESTADO_BADGE_CLASES: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",       // PENDIENTE
  2: "bg-amber-100 text-amber-800",     // EN_PROCESO
  3: "bg-blue-100 text-blue-800",       // COMPLETADO
  4: "bg-green-100 text-green-800",     // APROBADO
  5: "bg-red-100 text-red-700",         // RECHAZADO
  7: "bg-emerald-100 text-emerald-800", // FIRMADO
}

function ListadoIndiceContent() {
  // Parámetros de URL: si la página se abrió desde el dropdown de /ejecucion/subsistemas
  // con ?subSistemaId=, lo respetamos para precargar el filtro.
  const sp = useSearchParams()
  const initialSubSistemaId = sp.get("subSistemaId") ?? ""

  const [nivelId, setNivelId] = useState<string>("")
  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>(initialSubSistemaId)
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Catálogos
  const sistemas       = useGetSistemas({ pageSize: 200 }).data?.data ?? []
  const subSistemas    = useGetSubSistemas({ pageSize: 500, sistemaId: sistemaId || undefined }).data?.data ?? []
  const niveles        = (useGetNivelesSelect().data as { data?: Array<{ id: string; nombre: string; posicion: number }> })?.data ?? []
  const especialidades = useGetEspecialidades().data?.data ?? []
  const tiposTodos     = useGetElementosTipos({ pageSize: 200 }).data?.data ?? []

  // Si hay especialidad seleccionada, el dropdown de tipos se filtra a los de esa especialidad.
  const tiposParaFiltro = especialidadId
    ? tiposTodos.filter((t) => t.especialidadId === especialidadId)
    : tiposTodos

  const filtros = useMemo<ListadoIndiceFiltros>(() => ({
    nivelId:        nivelId        || undefined,
    sistemaId:      sistemaId      || undefined,
    subSistemaId:   subSistemaId   || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
  }), [nivelId, sistemaId, subSistemaId, especialidadId, elementoTipoId])

  const { data, isLoading, isFetching } = useGetListadoIndicePreview(filtros)
  const preview = data?.data
  const hayFiltro = !!(nivelId || sistemaId || subSistemaId || especialidadId || elementoTipoId)

  function limpiarFiltros() {
    setNivelId(""); setSistemaId(""); setSubSistemaId("")
    setEspecialidadId(""); setElementoTipoId("")
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listado índice de tareas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista anidada de todas las tareas del proyecto agrupadas por <strong>Nivel → Sistema → Subsistema → Especialidad</strong>.
            Filtrá lo que necesites y descargá el PDF (vertical, A4).
          </p>
        </div>
        <Button onClick={descargar} disabled={downloading || isLoading} className="gap-2 shrink-0">
          {downloading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />}
          {downloading ? "Generando..." : "Descargar PDF"}
        </Button>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FiltroSelect
            label="Nivel"
            value={nivelId}
            onChange={setNivelId}
            opciones={niveles.map((n) => ({ value: n.id, label: n.nombre }))}
          />
          <FiltroSelect
            label="Sistema"
            value={sistemaId}
            onChange={(v) => { setSistemaId(v); setSubSistemaId("") }}
            opciones={sistemas.map((s) => ({ value: s.id, label: `${s.codigo} · ${s.nombre}` }))}
          />
          <FiltroSelect
            label="Subsistema"
            value={subSistemaId}
            onChange={setSubSistemaId}
            opciones={subSistemas.map((ss) => ({ value: ss.id, label: `${ss.codigo} · ${ss.nombre}` }))}
          />
          <FiltroSelect
            label="Especialidad"
            value={especialidadId}
            onChange={(v) => { setEspecialidadId(v); setElementoTipoId("") }}
            opciones={especialidades.map((e) => ({ value: e.id, label: e.nombre }))}
          />
          <FiltroSelect
            label="Tipo de elemento"
            value={elementoTipoId}
            onChange={setElementoTipoId}
            opciones={tiposParaFiltro.map((t) => ({ value: t.id, label: t.nombre }))}
            disabled={tiposParaFiltro.length === 0}
          />
          {hayFiltro && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="self-end gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

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

function FiltroSelect({
  label, value, onChange, opciones, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(!v || v === ALL ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todos">
            {value ? (opciones.find((o) => o.value === value)?.label ?? "—") : "Todos"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

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
