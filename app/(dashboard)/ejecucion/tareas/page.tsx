"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, FileDown, FileSpreadsheet, FileText, Loader2, Package } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"
import { useGetElementosTiposUsados } from "@/features/elementostipos/api/use-get-elementostipos-usados"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"

import {
  descargarTareasExcel,
  useTareasListado,
  useTareasListadoCounts,
} from "@/features/tareas-listado/api/use-tareas-listado"
import { ESTADO_ET, ESTADO_ET_LABEL, type EstadoET, type TareasListadoFiltros } from "@/features/tareas-listado/types"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  FiltersChips, FiltersSheet, FiltersTrigger, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

const ESTADOS_OPCIONES: Array<{ value: EstadoET; label: string }> = [
  { value: ESTADO_ET.PENDIENTE,  label: "Pendiente" },
  { value: ESTADO_ET.EN_PROCESO, label: "En proceso" },
  { value: ESTADO_ET.COMPLETADO, label: "Completado" },
  { value: ESTADO_ET.APROBADO,   label: "Firmado físico" },
  { value: ESTADO_ET.RECHAZADO,  label: "Rechazado" },
  { value: ESTADO_ET.FIRMADO,    label: "Firmado" },
]

// Chips de bucket arriba de la tabla. Cada uno mapea a un set fijo de estados;
// el sheet permite además elegir un estado puntual (single-select) que puede
// "salirse" de estos presets.
type ChipBucketId = "pendientes" | "completadas" | "firmadas" | "rechazadas" | "todas"

const BUCKETS: Record<ChipBucketId, EstadoET[]> = {
  pendientes:  [ESTADO_ET.PENDIENTE, ESTADO_ET.EN_PROCESO],
  completadas: [ESTADO_ET.COMPLETADO],
  firmadas:    [ESTADO_ET.FIRMADO, ESTADO_ET.APROBADO],
  rechazadas:  [ESTADO_ET.RECHAZADO],
  todas:       [],
}

function chipDeEstados(estados: Set<EstadoET>): ChipBucketId | null {
  for (const [id, preset] of Object.entries(BUCKETS) as Array<[ChipBucketId, EstadoET[]]>) {
    if (preset.length === estados.size && preset.every((v) => estados.has(v))) {
      return id
    }
  }
  return null
}

const ESTADO_BADGE: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-amber-100 text-amber-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-green-100 text-green-800",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-200 text-gray-600",
  7: "bg-emerald-100 text-emerald-800",
}

interface NivelLike { id: string; nombre: string; posicion: number }
interface TipoLike { id: string; nombre: string; especialidadId?: string }
interface EspecialidadLike { id: string; codigo?: string | null; nombre: string }

export default function TareasListadoPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: perfil } = useGetPerfil()
  const { data: proyectoRaw } = useGetProyecto(perfil?.proyectoId ?? null)
  const permitirFisico = proyectoRaw?.data?.permitirRegistroFisico ?? false

  // Tab de scope (Mías / Todas). Default: Mías (tareas asignadas al user).
  // `?scope=mine|all` en URL habilita deep-link.
  const scopeEnUrl = searchParams.get("scope")
  const [scope, setScope] = useState<"mine" | "all">(
    scopeEnUrl === "all" ? "all" : "mine",
  )
  // Sync scope → URL (replace para no ensuciar el back button).
  const scopeSyncedRef = useRef(false)
  useEffect(() => {
    if (!scopeSyncedRef.current) { scopeSyncedRef.current = true; return }
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("scope") === scope) return
    params.set("scope", scope)
    router.replace(`${pathname}?${params.toString()}`)
  }, [scope, pathname, router, searchParams])

  // Filtros
  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>("")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [nivelId, setNivelId] = useState<string>("")
  // Default = bucket "Pendientes" (equivalente al chip por defecto de coordinación).
  const [estados, setEstados] = useState<Set<EstadoET>>(new Set(BUCKETS.pendientes))
  const [search, setSearch] = useState<string>("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  const { data: sistemasData } = useGetSistemasSelect()
  const { data: subsData } = useGetSubSistemasSelect()
  const { data: espData } = useGetEspecialidadesUsadas()
  const { data: tiposData } = useGetElementosTiposUsados()
  const { data: nivelesData } = useGetNivelesUsadosSelect()

  const sistemas = sistemasData?.data ?? []
  const subs = (subsData?.data ?? []).filter((s) => !sistemaId || s.sistemaId === sistemaId)
  const especialidades = (espData?.data ?? []) as EspecialidadLike[]
  const tiposElem = ((tiposData as any)?.data ?? []) as TipoLike[]
  const niveles = ((nivelesData as any)?.data ?? []) as NivelLike[]

  const tiposFiltrados = useMemo(
    () => (especialidadId ? tiposElem.filter((t) => t.especialidadId === especialidadId) : tiposElem),
    [tiposElem, especialidadId],
  )

  // ── Opciones para los Combobox del sheet ─────────────────────────────
  const sistemaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of sistemas) opts.push({ value: s.id, label: `${s.codigo} — ${s.nombre}` })
    return opts
  }, [sistemas])

  const subsistemaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of subs) opts.push({ value: s.id, label: `${s.codigo} — ${s.nombre}` })
    return opts
  }, [subs])

  const especialidadOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas" }]
    for (const e of especialidades) {
      opts.push({ value: e.id, label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre })
    }
    return opts
  }, [especialidades])

  const tipoOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const t of tiposFiltrados) opts.push({ value: t.id, label: t.nombre })
    return opts
  }, [tiposFiltrados])

  const nivelOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const n of [...niveles].sort((a, b) => a.posicion - b.posicion)) {
      opts.push({ value: n.id, label: n.nombre })
    }
    return opts
  }, [niveles])

  // Opciones del Combobox de Estado (single) dentro del sheet.
  const estadoSelectOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const o of ESTADOS_OPCIONES) opts.push({ value: String(o.value), label: o.label })
    return opts
  }, [])

  // Valor a mostrar en el Combobox: si hay exactamente 1 estado seleccionado, lo mostramos;
  // si son 0 → "Todos"; si son 2+ (chip activo con más de un estado) → dejamos "Todos" para
  // no falsear el select (el chip arriba ya indica el bucket real).
  const estadoSingle = estados.size === 1
    ? String(Array.from(estados)[0])
    : ALL

  const filtros: TareasListadoFiltros = {
    sistemaId: sistemaId || undefined,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
    nivelId: nivelId || undefined,
    estados: estados.size > 0 ? Array.from(estados) : undefined,
    search: search || undefined,
    // Tab "Mías": filtra ETs asignadas al user actual. En "Todas" no aplica.
    asignadoA: scope === "mine" ? perfil?.id : undefined,
  }

  const { data, isLoading, isFetching } = useTareasListado(filtros, page, pageSize)
  const { data: counts } = useTareasListadoCounts(filtros)
  const paged = data?.data
  const items = paged?.items ?? []
  const total = paged?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const chipActivo = chipDeEstados(estados)
  const setChip = (id: ChipBucketId) => {
    setEstados(new Set(BUCKETS[id]))
    resetFiltrado()
  }

  // Al cambiar filtros vamos a la página 1 y limpiamos selección.
  function resetFiltrado() {
    setPage(1)
    setSeleccion(new Set())
  }

  // ── Chips de filtros activos (los del sheet) ─────────────────────────
  const activeFilters: FilterChip[] = []
  const chip = (id: string, key: string, value: string, onRemove: () => void) =>
    activeFilters.push({ id, label: `${key}: ${value}`, onRemove })

  if (sistemaId) {
    chip("sist", "Sistema", sistemaOptions.find((o) => o.value === sistemaId)?.label ?? sistemaId,
      () => { setSistemaId(""); setSubSistemaId(""); resetFiltrado() })
  }
  if (subSistemaId) {
    chip("sub", "Subsistema", subsistemaOptions.find((o) => o.value === subSistemaId)?.label ?? subSistemaId,
      () => { setSubSistemaId(""); resetFiltrado() })
  }
  if (especialidadId) {
    chip("esp", "Especialidad", especialidadOptions.find((o) => o.value === especialidadId)?.label ?? especialidadId,
      () => { setEspecialidadId(""); setElementoTipoId(""); resetFiltrado() })
  }
  if (elementoTipoId) {
    chip("tipo", "Tipo", tipoOptions.find((o) => o.value === elementoTipoId)?.label ?? elementoTipoId,
      () => { setElementoTipoId(""); resetFiltrado() })
  }
  if (nivelId) {
    chip("niv", "Nivel", nivelOptions.find((o) => o.value === nivelId)?.label ?? nivelId,
      () => { setNivelId(""); resetFiltrado() })
  }

  const limpiarFiltros = () => {
    setSistemaId(""); setSubSistemaId(""); setEspecialidadId("")
    setElementoTipoId(""); setNivelId(""); setEstados(new Set())
    resetFiltrado()
  }

  // Selección para bulk download de planillas (sólo ET con planillaId).
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [descargandoZip, setDescargandoZip] = useState(false)
  const [zipError, setZipError] = useState<string | null>(null)

  const seleccionablesVisibles = items.filter((it) => !!it.planillaId).map((it) => it.elementoTareaId)
  const todasVisiblesSeleccionadas = seleccionablesVisibles.length > 0
    && seleccionablesVisibles.every((id) => seleccion.has(id))

  function toggleSeleccion(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleTodasVisibles() {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (todasVisiblesSeleccionadas) {
        for (const id of seleccionablesVisibles) next.delete(id)
      } else {
        for (const id of seleccionablesVisibles) next.add(id)
      }
      return next
    })
  }
  function limpiarSeleccion() {
    setSeleccion(new Set())
  }

  async function descargarZipPlanillas() {
    if (seleccion.size === 0) return
    setZipError(null)
    setDescargandoZip(true)
    try {
      const res = await fetch("/api/planillas/pdf/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elementoTareaIds: Array.from(seleccion),
          agruparPorTarea: true,
        }),
      })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(errorBody || `Error ${res.status} al generar el ZIP`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const cd = res.headers.get("content-disposition") ?? ""
      const m = /filename="?([^"]+)"?/.exec(cd)
      a.download = m?.[1] ?? "Planillas_Bulk.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setZipError((e as Error).message)
    } finally {
      setDescargandoZip(false)
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Listado de tareas</h1>

      {/* Header — tabs (Mías/Todas) + búsqueda + filtros + descarga excel */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="inline-flex items-center rounded-md border bg-muted p-0.5 self-start">
          <button
            type="button"
            onClick={() => { setScope("mine"); resetFiltrado() }}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
              scope === "mine"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={scope === "mine"}
          >
            Mías
          </button>
          <button
            type="button"
            onClick={() => { setScope("all"); resetFiltrado() }}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
              scope === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={scope === "all"}
          >
            Todas
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Input
            value={search}
            placeholder="Buscar por TAG, nombre o código…"
            onChange={(e) => { setSearch(e.target.value); resetFiltrado() }}
            className="h-9 w-full sm:w-64"
          />
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
          <Button
            variant="outline"
            onClick={() => descargarTareasExcel(filtros)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Chips de bucket — visibles arriba de la lista. Cuentan sobre el scope actual
          (Mías/Todas) y el resto de filtros del sheet. Un preset "custom" desde el
          sheet deja los 5 chips desactivados (el estado igual aplica). */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipBucket
          active={chipActivo === "pendientes"}
          label="Pendientes"
          count={counts?.pendientes}
          tone="amber"
          onClick={() => setChip("pendientes")}
        />
        <ChipBucket
          active={chipActivo === "completadas"}
          label="Completadas"
          count={counts?.completadas}
          tone="blue"
          onClick={() => setChip("completadas")}
        />
        <ChipBucket
          active={chipActivo === "firmadas"}
          label="Firmadas"
          count={counts?.firmadas}
          tone="green"
          onClick={() => setChip("firmadas")}
        />
        <ChipBucket
          active={chipActivo === "rechazadas"}
          label="Rechazadas"
          count={counts?.rechazadas}
          tone="red"
          onClick={() => setChip("rechazadas")}
        />
        <ChipBucket
          active={chipActivo === "todas"}
          label="Todas"
          count={counts?.total}
          tone="gray"
          onClick={() => setChip("todas")}
        />
      </div>

      <FiltersChips activeFilters={activeFilters} onClearAll={limpiarFiltros} />

      {/* Toolbar de selección */}
      {seleccion.size > 0 && (
        <div className="sticky top-14 z-30 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex flex-col lg:flex-row lg:items-center gap-2 shadow-sm">
          <span className="text-sm text-blue-900">
            <strong>{seleccion.size}</strong> tarea(s) seleccionada(s) para descarga de planillas en blanco.
          </span>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={descargarZipPlanillas}
              disabled={descargandoZip}
              className="gap-2"
            >
              {descargandoZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
              Descargar {seleccion.size} planillas (ZIP)
            </Button>
            <Button size="sm" variant="ghost" onClick={limpiarSeleccion}>
              Limpiar
            </Button>
          </div>
          {zipError && <span className="text-xs text-red-700 basis-full">{zipError}</span>}
        </div>
      )}

      {/* Cards (mobile + tablet, < 1024px) */}
      <div className="lg:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Sin tareas para los filtros actuales.
          </div>
        ) : (
          items.map((it) => {
            const seleccionable = !!it.planillaId
            const checked = seleccion.has(it.elementoTareaId)
            return (
              <div
                key={it.elementoTareaId}
                className={
                  "rounded-lg border bg-white p-3 space-y-2 " +
                  (checked ? "border-blue-300 bg-blue-50/40" : "")
                }
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    disabled={!seleccionable}
                    checked={checked}
                    onChange={() => toggleSeleccion(it.elementoTareaId)}
                    className="h-4 w-4 mt-1 rounded border-input shrink-0 accent-blue-900"
                    aria-label="Seleccionar"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gray-500 truncate">{it.tag}</p>
                    <p className="font-medium truncate">{it.tareaNombre}</p>
                    {it.elementoNombre && (
                      <p className="text-xs text-gray-500 truncate">{it.elementoNombre}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {it.subSistemaCodigo ?? "—"}
                      {it.nivelNombre && <> · {it.nivelNombre}</>}
                      {it.elementoTipoNombre && <> · {it.elementoTipoNombre}</>}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[it.estado] ?? "bg-gray-100 text-gray-600"}`}>
                    {ESTADO_ET_LABEL[it.estado] ?? it.estadoTexto}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t">
                  <div className="text-[11px] text-muted-foreground truncate">
                    Cód: <span className="font-mono">{it.codigo}</span>
                    {it.fechaEstimada && <> · Planif.: {fmtFechaCorta(it.fechaEstimada)}</>}
                    {it.fechaFinalizacion && <> · <span className="text-emerald-700">✓ {fmtFechaCorta(it.fechaFinalizacion)}</span></>}
                  </div>
                  <AccionesFila
                    row={it}
                    permitirFisico={permitirFisico}
                    onIrARegistro={() => router.push(`/ejecucion/registros/${it.registroId}?returnTo=/ejecucion/tareas`)}
                    onIrAElemento={() => router.push(`/ejecucion/elementos?subSistemaId=${it.subSistemaId}&elementoId=${it.elementoId}`)}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabla (solo desktop >= 1024px) */}
      <div className="hidden lg:block">
        <DataTableWrapper isFetching={isFetching && !isLoading}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={todasVisiblesSeleccionadas}
                    disabled={seleccionablesVisibles.length === 0}
                    onChange={toggleTodasVisibles}
                    className="h-4 w-4 accent-blue-900"
                    aria-label="Seleccionar todas las visibles con planilla"
                  />
                </TableHead>
                <TableHead className="w-28">TAG</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                <TableHead className="w-24">Código</TableHead>
                <TableHead className="w-40">Sistema</TableHead>
                <TableHead className="w-40">Subsistema</TableHead>
                <TableHead className="w-40">Especialidad / Tipo</TableHead>
                <TableHead className="w-24">Fechas</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Sin tareas para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => {
                  const seleccionable = !!it.planillaId
                  const checked = seleccion.has(it.elementoTareaId)
                  return (
                    <TableRow key={it.elementoTareaId} className="hover:bg-blue-50/30">
                      <TableCell>
                        <input
                          type="checkbox"
                          disabled={!seleccionable}
                          checked={checked}
                          onChange={() => toggleSeleccion(it.elementoTareaId)}
                          className="h-4 w-4 accent-blue-900"
                          aria-label="Seleccionar"
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{it.tag}</div>
                        {it.elementoNombre && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-40">{it.elementoNombre}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{it.tareaNombre}</div>
                        {it.nivelNombre && (
                          <div className="text-[11px] text-muted-foreground truncate">{it.nivelNombre}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[it.estado] ?? "bg-gray-100 text-gray-600"}`}>
                          {ESTADO_ET_LABEL[it.estado] ?? it.estadoTexto}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                      <TableCell className="text-xs">
                        {it.sistemaCodigo ?? "—"}
                        {it.sistemaNombre && <div className="text-[10px] text-muted-foreground truncate max-w-40">{it.sistemaNombre}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {it.subSistemaCodigo ?? "—"}
                        {it.subSistemaNombre && <div className="text-[10px] text-muted-foreground truncate max-w-40">{it.subSistemaNombre}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {it.especialidadNombre ?? "—"}
                        {it.elementoTipoNombre && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-40">
                            {it.elementoTipoNombre}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div title="Fecha planificada">{fmtFechaCorta(it.fechaEstimada)}</div>
                        {it.fechaFinalizacion && (
                          <div className="text-[10px] text-emerald-700" title="Finalizado">
                            ✓ {fmtFechaCorta(it.fechaFinalizacion)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AccionesFila
                          row={it}
                          permitirFisico={permitirFisico}
                          onIrARegistro={() => router.push(`/ejecucion/registros/${it.registroId}?returnTo=/ejecucion/tareas`)}
                          onIrAElemento={() => router.push(`/ejecucion/elementos?subSistemaId=${it.subSistemaId}&elementoId=${it.elementoId}`)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
        <div>
          {isFetching && !isLoading && <span><Loader2 className="inline h-3 w-3 animate-spin mr-1" /> </span>}
          {total.toLocaleString("es-AR")} tarea(s) en total
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      {/* Sheet de filtros */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={limpiarFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Sistema">
          <Combobox
            options={sistemaOptions}
            value={sistemaId || ALL}
            onChange={(v) => {
              setSistemaId(v === ALL ? "" : v)
              setSubSistemaId("")
              resetFiltrado()
            }}
            placeholder="Todos" searchPlaceholder="Buscar sistema..."
          />
        </FilterField>
        <FilterField label="Subsistema">
          <Combobox
            options={subsistemaOptions}
            value={subSistemaId || ALL}
            onChange={(v) => { setSubSistemaId(v === ALL ? "" : v); resetFiltrado() }}
            placeholder="Todos" searchPlaceholder="Buscar subsistema..."
          />
        </FilterField>
        <FilterField label="Especialidad">
          <Combobox
            options={especialidadOptions}
            value={especialidadId || ALL}
            onChange={(v) => {
              setEspecialidadId(v === ALL ? "" : v)
              setElementoTipoId("")
              resetFiltrado()
            }}
            placeholder="Todas" searchPlaceholder="Buscar especialidad..."
          />
        </FilterField>
        <FilterField label="Tipo de elemento">
          <Combobox
            options={tipoOptions}
            value={elementoTipoId || ALL}
            onChange={(v) => { setElementoTipoId(v === ALL ? "" : v); resetFiltrado() }}
            placeholder="Todos" searchPlaceholder="Buscar tipo..."
          />
        </FilterField>
        <FilterField label="Nivel">
          <Combobox
            options={nivelOptions}
            value={nivelId || ALL}
            onChange={(v) => { setNivelId(v === ALL ? "" : v); resetFiltrado() }}
            placeholder="Todos" searchPlaceholder="Buscar nivel..."
          />
        </FilterField>
        <FilterField label="Estado (fino)">
          <Combobox
            options={estadoSelectOptions}
            value={estadoSingle}
            onChange={(v) => {
              // ALL = no filtrar por estado (equivale al chip Todas)
              // Cualquier otro valor: setea estados = [v] — puede o no coincidir con
              // un bucket; si no coincide, ningún chip queda activo.
              if (v === ALL) setEstados(new Set())
              else setEstados(new Set([Number(v) as EstadoET]))
              resetFiltrado()
            }}
            placeholder="Todos" searchPlaceholder="Buscar estado..."
          />
        </FilterField>
      </FiltersSheet>
    </div>
  )
}

function AccionesFila({
  row, permitirFisico, onIrARegistro, onIrAElemento,
}: {
  row: import("@/features/tareas-listado/types").TareaListadoRow
  permitirFisico: boolean
  onIrARegistro: () => void
  onIrAElemento: () => void
}) {
  const tienePlanilla = !!row.planillaId
  const tieneRegistro = !!row.registroId
  const urlBlanco = tienePlanilla
    ? `/api/planillas/${row.planillaId}/pdf/blanco/${row.elementoTareaId}`
    : null

  return (
    <div className="flex items-center gap-1 justify-end">
      {tieneRegistro && (
        row.registroEsFisico ? (
          <a
            href={`/api/registros/${row.registroId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Descargar PDF del registro físico"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            title="Ir al registro (completar o ver)"
            onClick={onIrARegistro}
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        )
      )}
      {tienePlanilla && permitirFisico && urlBlanco && (
        <a
          href={urlBlanco}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
          title="Descargar planilla en blanco"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        title="Ver elemento"
        onClick={onIrAElemento}
      >
        <FileDown className="h-3.5 w-3.5 rotate-180" />
      </Button>
    </div>
  )
}

function fmtFecha(f: string | null): string {
  if (!f) return "—"
  const d = new Date(f)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Chip visual del bucket (mismo look & feel que en /coordinacion/tareas) ──
interface ChipBucketProps {
  active: boolean
  label: string
  count: number | undefined
  tone: "gray" | "amber" | "blue" | "green" | "red"
  onClick: () => void
}
function ChipBucket({ active, label, count, tone, onClick }: ChipBucketProps) {
  const inactive: Record<string, string> = {
    gray:  "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
    amber: "bg-white text-amber-900 border-amber-300 hover:bg-amber-50",
    blue:  "bg-white text-blue-900 border-blue-300 hover:bg-blue-50",
    green: "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50",
    red:   "bg-white text-red-900 border-red-300 hover:bg-red-50",
  }
  const activeCls: Record<string, string> = {
    gray:  "bg-gray-800 text-white border-gray-800",
    amber: "bg-amber-600 text-white border-amber-600",
    blue:  "bg-blue-700 text-white border-blue-700",
    green: "bg-emerald-700 text-white border-emerald-700",
    red:   "bg-red-600 text-white border-red-600",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer " +
        (active ? activeCls[tone] : inactive[tone])
      }
      aria-pressed={active}
    >
      {label}
      {typeof count === "number" && (
        <span className={
          "inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none py-0.5 " +
          (active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-700")
        }>
          {count}
        </span>
      )}
    </button>
  )
}

/** Formato corto para celdas apretadas: "dd/MM/yy". */
function fmtFechaCorta(f: string | null): string {
  if (!f) return "—"
  const d = new Date(f)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}
