"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react"

import {
  buildListadoPendientesPdfUrl,
  useGetListadoPendientesPreview,
} from "@/features/reportes/api/use-listado-pendientes"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import type {
  ListadoPendientesFiltros,
  ListadoPendientesItem,
  ListadoPendientesSistemaGrupo,
  ListadoPendientesSubSistemaGrupo,
} from "@/features/reportes/types"

import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import {
  useGetPendienteCategorias, useGetPendienteEstados, useGetPendienteTipos,
} from "@/features/pendientes/api/use-catalogos"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import {
  ESTADO_COLOR, ESTADO_LABEL, PRIORIDAD, PRIORIDAD_COLOR,
} from "@/features/pendientes/types"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FiltersTrigger, FiltersChips, FiltersSheet, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"

const ALL = "__all__"

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    // El backend envía DateOnly como "YYYY-MM-DD" (sin TZ). Parseamos manualmente para
    // evitar shift por timezone.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return new Date(iso).toLocaleDateString("es-AR")
  } catch {
    return iso
  }
}

function PendientesContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const sistemaIdParam = sp.get("sistemaId") ?? ""
  const subSistemaIdParam = sp.get("subSistemaId") ?? ""

  const [sistemaId, setSistemaId] = useState<string>(sistemaIdParam)
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam)
  const [categoriaId, setCategoriaId] = useState<string>("")
  const [tipoId, setTipoId] = useState<string>("")
  const [estadoId, setEstadoId] = useState<string>("")
  const [responsableId, setResponsableId] = useState<string>("")
  const [prioridad, setPrioridad] = useState<string>("")
  const [soloAbiertos, setSoloAbiertos] = useState<boolean>(true)
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
    router.replace(s ? `/reporte/pendientes?${s}` : "/reporte/pendientes")
  }

  const perfil = useGetPerfil().data
  const sistemas         = useGetSistemasSelect().data?.data ?? []
  const todosSubSistemas = useGetSubSistemasSelect().data?.data ?? []
  const estados          = useGetPendienteEstados().data?.data ?? []
  const categorias       = useGetPendienteCategorias().data?.data ?? []
  const tipos            = useGetPendienteTipos().data?.data ?? []
  const usuarios         = useGetProyectoUsuarios(perfil?.proyectoId ?? null).data ?? []

  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId) : todosSubSistemas),
    [todosSubSistemas, sistemaId],
  )

  const filtros = useMemo<ListadoPendientesFiltros>(() => ({
    sistemaId:     sistemaId     || undefined,
    subSistemaId:  subSistemaId  || undefined,
    categoriaId:   categoriaId   || undefined,
    tipoId:        tipoId        || undefined,
    estadoId:      estadoId      || undefined,
    responsableId: responsableId || undefined,
    prioridad:     prioridad ? Number(prioridad) : undefined,
    soloAbiertos,
  }), [sistemaId, subSistemaId, categoriaId, tipoId, estadoId, responsableId, prioridad, soloAbiertos])

  const { data, isLoading, isFetching } = useGetListadoPendientesPreview(filtros)
  const preview = data?.data

  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    let nextSub = subSistemaId
    if (id && subSistemaId) {
      const ss = todosSubSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) { nextSub = ""; setSubSistemaId("") }
    }
    syncUrl(id, nextSub)
  }
  function handleSubSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSubSistemaId(id)
    syncUrl(sistemaId, id)
  }
  function handleClearFiltros() {
    setSistemaId(""); setSubSistemaId(""); setCategoriaId(""); setTipoId("")
    setEstadoId(""); setResponsableId(""); setPrioridad(""); setSoloAbiertos(true)
    syncUrl("", "")
  }

  // Chips activos. "Solo abiertos = OFF" se considera filtro activo (no es el default).
  const sistemaSel      = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSel   = todosSubSistemas.find((ss) => ss.id === subSistemaId)
  const categoriaSel    = categorias.find((c) => c.id === categoriaId)
  const tipoSel         = tipos.find((t) => t.id === tipoId)
  const estadoSel       = estados.find((e) => e.id === estadoId)
  const responsableSel  = usuarios.find((u: any) => u.usuarioId === responsableId)

  const activeFilters: FilterChip[] = []
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
  if (estadoId) activeFilters.push({
    id: "estado",
    label: `Estado: ${ESTADO_LABEL[estadoSel?.estado ?? ""] ?? estadoSel?.estado ?? "—"}`,
    onRemove: () => setEstadoId(""),
  })
  if (categoriaId) activeFilters.push({
    id: "categoria",
    label: `Categoría: ${categoriaSel?.nombre ?? "—"}`,
    onRemove: () => setCategoriaId(""),
  })
  if (tipoId) activeFilters.push({
    id: "tipo",
    label: `Tipo: ${tipoSel?.tipo ?? "—"}`,
    onRemove: () => setTipoId(""),
  })
  if (prioridad) activeFilters.push({
    id: "prioridad",
    label: `Prioridad: ${PRIORIDAD[Number(prioridad)] ?? "—"}`,
    onRemove: () => setPrioridad(""),
  })
  if (responsableId) activeFilters.push({
    id: "responsable",
    label: `Responsable: ${responsableSel?.userName ?? "—"}`,
    onRemove: () => setResponsableId(""),
  })
  if (!soloAbiertos) activeFilters.push({
    id: "incluir-cerrados",
    label: "Incluye cerrados/cancelados",
    onRemove: () => setSoloAbiertos(true),
  })

  async function descargar() {
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf(buildListadoPendientesPdfUrl(filtros), "listado-pendientes.pdf")
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
          <h1 className="text-2xl font-bold text-gray-900">Listado de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pendientes detectados del proyecto, agrupados por <strong>Sistema → Subsistema</strong>.
            Por defecto se muestran solo los abiertos. PDF vertical, A4.
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
        <FilterField label="Estado">
          <Select value={estadoId || ALL} onValueChange={(v) => setEstadoId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {estadoId
                  ? ESTADO_LABEL[estadoSel?.estado ?? ""] ?? estadoSel?.estado ?? "—"
                  : "Todos los estados"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {estados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {ESTADO_LABEL[e.estado] ?? e.estado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Responsable">
          <Select value={responsableId || ALL} onValueChange={(v) => setResponsableId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {responsableSel?.userName ?? "Cualquiera"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Cualquiera</SelectItem>
              {usuarios.map((u: any) => (
                <SelectItem key={u.usuarioId} value={u.usuarioId}>{u.userName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Sistema">
          <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {sistemaSel ? `${sistemaSel.codigo} — ${sistemaSel.nombre}` : "Todos los sistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
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
                {subSistemaSel ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}` : "Todos los subsistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
              {subSistemasFiltrados.map((ss) => (
                <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Categoría">
          <Select value={categoriaId || ALL} onValueChange={(v) => setCategoriaId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{categoriaSel?.nombre ?? "Todas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Tipo">
          <Select value={tipoId || ALL} onValueChange={(v) => setTipoId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{tipoSel?.tipo ?? "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Prioridad">
          <Select value={prioridad || ALL} onValueChange={(v) => setPrioridad(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{prioridad ? PRIORIDAD[Number(prioridad)] : "Todas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                <SelectItem key={id} value={id}>{nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Mostrar">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloAbiertos}
              onChange={(e) => setSoloAbiertos(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Solo abiertos (excluye CERRADO / CANCELADO)
          </label>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Total"      value={preview.total.toLocaleString("es-AR")} />
            <Kpi label="Abiertos"   value={preview.abiertos.toLocaleString("es-AR")}   color="text-amber-700" />
            <Kpi label="En proceso" value={preview.enProceso.toLocaleString("es-AR")}  color="text-blue-700" />
            <Kpi label="Cerrados"   value={preview.cerrados.toLocaleString("es-AR")}   color="text-green-700" />
            <Kpi label="Cancelados" value={preview.cancelados.toLocaleString("es-AR")} color="text-gray-500" />
            <Kpi label="Críticos"   value={preview.criticos.toLocaleString("es-AR")}   color="text-red-700" />
          </div>

          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground">(actualizando...)</p>
          )}

          {preview.sistemas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-muted-foreground">
              No hay pendientes que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              {preview.sistemas.map((s) => (
                <SistemaSection key={s.sistemaId ?? "sin-sistema"} sistema={s} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default function PendientesReportePage() {
  return (
    <Suspense>
      <PendientesContent />
    </Suspense>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-0.5 ${color ?? "text-blue-900"}`}>{value}</div>
    </div>
  )
}

function SistemaSection({ sistema }: { sistema: ListadoPendientesSistemaGrupo }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="rounded-lg border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-blue-900 text-white px-4 py-2.5 flex items-center gap-2 hover:bg-blue-800 transition"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-semibold text-sm uppercase tracking-wide">
          {sistema.sistemaCodigo
            ? `Sistema · ${sistema.sistemaCodigo} — ${sistema.sistemaNombre ?? ""}`
            : "Sin sistema asignado"}
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-3">
          {sistema.subSistemas.map((ss) => (
            <SubSistemaSection key={ss.subSistemaId ?? "sin-sub"} sub={ss} />
          ))}
        </div>
      )}
    </section>
  )
}

function SubSistemaSection({ sub }: { sub: ListadoPendientesSubSistemaGrupo }) {
  return (
    <div className="border border-gray-100 rounded-md overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100">
        <div className="text-sm">
          {sub.subSistemaCodigo ? (
            <>
              <span className="font-mono font-semibold">{sub.subSistemaCodigo}</span>
              <span className="text-muted-foreground"> · {sub.subSistemaNombre ?? "—"}</span>
            </>
          ) : (
            <span className="italic text-gray-600">Sin subsistema asignado</span>
          )}
        </div>
        <div className="text-xs">
          <span className="font-semibold text-amber-700">{sub.abiertos}</span>
          <span className="text-muted-foreground"> abiertos · </span>
          <span className="font-semibold text-green-700">{sub.cerrados}</span>
          <span className="text-muted-foreground"> cerrados</span>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-white text-gray-600">
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold px-3 py-1.5 w-20">Código</th>
            <th className="text-left font-semibold px-3 py-1.5">Descripción</th>
            <th className="text-left font-semibold px-3 py-1.5 w-28">Categoría</th>
            <th className="text-left font-semibold px-3 py-1.5 w-20">Prioridad</th>
            <th className="text-left font-semibold px-3 py-1.5 w-32">Estado</th>
            <th className="text-left font-semibold px-3 py-1.5 w-32">Responsable</th>
            <th className="text-left font-semibold px-3 py-1.5 w-20">Detec.</th>
            <th className="text-left font-semibold px-3 py-1.5 w-20">Cierre est.</th>
          </tr>
        </thead>
        <tbody>
          {sub.pendientes.map((p) => <PendienteRow key={p.id} p={p} />)}
        </tbody>
      </table>
    </div>
  )
}

function PendienteRow({ p }: { p: ListadoPendientesItem }) {
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-1.5 font-mono text-[11px] text-blue-700">{p.codigoFormateado}</td>
      <td className="px-3 py-1.5">
        <div>{p.descripcion ?? "—"}</div>
        {(p.elementoTag || p.elementoNombre) && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {p.elementoTag && <span className="font-mono">{p.elementoTag}</span>}
            {p.elementoNombre && <span> · {p.elementoNombre}</span>}
          </div>
        )}
      </td>
      <td className="px-3 py-1.5 text-gray-600">{p.categoriaNombre ?? "—"}</td>
      <td className="px-3 py-1.5">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${PRIORIDAD_COLOR[p.prioridad] ?? "bg-gray-100"}`}>
          {PRIORIDAD[p.prioridad] ?? "—"}
        </span>
      </td>
      <td className="px-3 py-1.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
          {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre ?? "—"}
        </span>
      </td>
      <td className="px-3 py-1.5 text-gray-700">{p.responsableNombre ?? "—"}</td>
      <td className="px-3 py-1.5 tabular-nums text-gray-500">{fmtFecha(p.fechaDeteccion)}</td>
      <td className="px-3 py-1.5 tabular-nums text-gray-500">{fmtFecha(p.fechaCierreEstimado)}</td>
    </tr>
  )
}
