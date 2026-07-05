"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RotateCcw, Save, X, FileSpreadsheet } from "lucide-react"
import { ImportFechasSheet } from "@/features/planificacion/components/import-fechas-sheet"

import {
  useActualizarFechasBulk,
  useGetPlanificacionTareas,
} from "@/features/planificacion/api/use-planificacion-manual"
import type {
  PlanificacionTareaItem,
  PlanificacionTareasFiltros,
} from "@/features/planificacion/types"

import { useGetSistemas } from "@/features/sistemas/api/use-get-sistemas"
import { useGetSubSistemas } from "@/features/subsistemas/api/use-get-subsistemas"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetElementosTiposUsados } from "@/features/elementostipos/api/use-get-elementostipos-usados"
import { Combobox } from "@/components/ui/combobox"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"

// Para los selects de Estado y Origen, usamos un valor sentinel "ALL" porque shadcn Select
// no acepta value="" (lanza warning). Mapeamos a undefined al construir los filtros.
const ALL = "_all"

const ESTADO_LABELS: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  // APROBADO en backend = "Firmado físico" en UI (firma en papel, no digital).
  4: "Firmado físico",
  5: "Rechazado",
  7: "Firmado",
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch {
    return iso
  }
}

// Convierte ISO (con hora) a "YYYY-MM-DD" para inputs type="date".
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  } catch {
    return ""
  }
}

// Compara dos strings de fecha (YYYY-MM-DD vs ISO). Devuelve true si representan el mismo día.
function sameDay(originalIso: string | null, editValue: string | null): boolean {
  if (!originalIso && !editValue) return true
  if (!originalIso || !editValue) return false
  return toDateInput(originalIso) === editValue
}

export default function PlanificacionManualPage() {
  const [importOpen, setImportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filtros — todos opcionales. Cuando un campo está vacío significa "todos".
  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>("")
  const [nivelId, setNivelId] = useState<string>("")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [estado, setEstado] = useState<string>(ALL)
  const [origen, setOrigen] = useState<string>(ALL)
  const [sinFecha, setSinFecha] = useState<boolean>(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Mapa local de ediciones — key: elementoTareaId, value: "YYYY-MM-DD" | null (cleared).
  // No persistimos a backend hasta apretar "Guardar cambios".
  const [edits, setEdits] = useState<Record<string, string | null>>({})
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Catálogos para los filtros.
  const sistemas        = useGetSistemas({ pageSize: 200 }).data?.data ?? []
  const subSistemas     = useGetSubSistemas({ pageSize: 500, sistemaId: sistemaId || undefined }).data?.data ?? []
  const niveles         = (useGetNivelesSelect().data as { data?: Array<{ id: string; nombre: string; posicion: number }> })?.data ?? []
  const especialidades  = useGetEspecialidades().data?.data ?? []
  const tipos: Array<{ id: string; nombre: string; especialidadId?: string }> =
    (useGetElementosTiposUsados().data as any)?.data ?? []

  // Al cambiar cualquier filtro volvemos a la página 1 — sino podés quedar en pág 5 con
  // 2 páginas totales y ver una lista vacía sin entender por qué.
  useEffect(() => {
    setPage(1)
  }, [sistemaId, subSistemaId, nivelId, especialidadId, elementoTipoId, estado, origen, sinFecha])

  const filtros = useMemo<PlanificacionTareasFiltros>(() => ({
    sistemaId:      sistemaId      || undefined,
    subSistemaId:   subSistemaId   || undefined,
    nivelId:        nivelId        || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
    estado:         estado === ALL ? undefined : Number(estado),
    origen:         origen === ALL ? undefined : Number(origen),
    sinFecha:       sinFecha || undefined,
    page,
    pageSize,
  }), [sistemaId, subSistemaId, nivelId, especialidadId, elementoTipoId, estado, origen, sinFecha, page])

  const { data, isLoading, isFetching, refetch } = useGetPlanificacionTareas(filtros)
  const tareas = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const guardar = useActualizarFechasBulk()

  // Aplicamos los edits sobre las tareas para que la tabla muestre el valor en edición.
  const filasMostradas = tareas.map((t) => {
    const editValue = edits[t.elementoTareaId]
    const editado = editValue !== undefined
    const fechaActualInput = editado ? (editValue ?? "") : toDateInput(t.fechaPlanificada)
    return { ...t, _fechaInput: fechaActualInput, _editado: editado }
  })

  // Cantidad de cambios sin guardar (descartamos los que coinciden con el valor original).
  const cambiosCount = Object.entries(edits).filter(([id, v]) => {
    const orig = tareas.find((t) => t.elementoTareaId === id)
    if (!orig) return true
    return !sameDay(orig.fechaPlanificada, v)
  }).length

  function setEdit(id: string, value: string | null) {
    setSavedMsg(null)
    setError(null)
    setEdits((prev) => ({ ...prev, [id]: value }))
  }

  function descartarFila(id: string) {
    setEdits((prev) => {
      const { [id]: _omit, ...rest } = prev
      return rest
    })
  }

  function descartarTodo() {
    setEdits({})
    setSavedMsg(null)
    setError(null)
  }

  async function guardarTodo() {
    if (cambiosCount === 0) return
    setError(null)
    setSavedMsg(null)
    try {
      const payload = Object.entries(edits)
        .filter(([id, v]) => {
          const orig = tareas.find((t) => t.elementoTareaId === id)
          if (!orig) return true
          return !sameDay(orig.fechaPlanificada, v)
        })
        .map(([elementoTareaId, fechaPlanificada]) => ({
          elementoTareaId,
          fechaPlanificada: fechaPlanificada ? new Date(fechaPlanificada).toISOString() : null,
        }))
      const resp = await guardar.mutateAsync(payload)
      const r = resp.data
      setSavedMsg(
        r?.noEncontradas
          ? `${r.actualizadas} actualizadas, ${r.noEncontradas} no encontradas. Refrescando...`
          : `${r?.actualizadas ?? 0} tareas actualizadas.`,
      )
      setEdits({})
      await refetch()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function limpiarFiltros() {
    setSistemaId("")
    setSubSistemaId("")
    setNivelId("")
    setEspecialidadId("")
    setElementoTipoId("")
    setEstado(ALL)
    setOrigen(ALL)
    setSinFecha(false)
  }

  // Cuando se cambia la especialidad y el tipo actual dejó de pertenecerle, lo limpiamos.
  function handleEspecialidadChange(v: string) {
    setEspecialidadId(v)
    if (v && elementoTipoId) {
      const tipo = tipos.find((t) => t.id === elementoTipoId)
      if (tipo?.especialidadId !== v) setElementoTipoId("")
    }
  }

  // Tipos filtrados por especialidad para el Combobox — mismo criterio que en /ejecucion/elementos.
  const tipoOptions = useMemo(() => {
    const filtrados = especialidadId
      ? tipos.filter((t) => t.especialidadId === especialidadId)
      : tipos
    return [
      { value: "", label: "Todos los tipos" },
      ...filtrados.map((t) => ({ value: t.id, label: t.nombre })),
    ]
  }, [tipos, especialidadId])

  // Chips visibles de filtros activos — cada uno con su callback de "quitar".
  const activeFilters: FilterChip[] = []
  if (sistemaId) {
    const s = sistemas.find((x) => x.id === sistemaId)
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${s ? `${s.codigo} · ${s.nombre}` : "—"}`,
      onRemove: () => { setSistemaId(""); setSubSistemaId("") },
    })
  }
  if (subSistemaId) {
    const ss = subSistemas.find((x) => x.id === subSistemaId)
    activeFilters.push({
      id: "subsistema",
      label: `Subsistema: ${ss ? `${ss.codigo} · ${ss.nombre}` : "—"}`,
      onRemove: () => setSubSistemaId(""),
    })
  }
  if (nivelId) {
    const n = niveles.find((x) => x.id === nivelId)
    activeFilters.push({
      id: "nivel",
      label: `Nivel: ${n?.nombre ?? "—"}`,
      onRemove: () => setNivelId(""),
    })
  }
  if (especialidadId) {
    const esp = especialidades.find((x) => x.id === especialidadId)
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${esp?.nombre ?? "—"}`,
      onRemove: () => handleEspecialidadChange(""),
    })
  }
  if (elementoTipoId) {
    const tipo = tipos.find((x) => x.id === elementoTipoId)
    activeFilters.push({
      id: "tipo",
      label: `Tipo: ${tipo?.nombre ?? "—"}`,
      onRemove: () => setElementoTipoId(""),
    })
  }
  if (estado !== ALL) {
    activeFilters.push({
      id: "estado",
      label: `Estado: ${ESTADO_LABELS[Number(estado)] ?? "—"}`,
      onRemove: () => setEstado(ALL),
    })
  }
  if (origen !== ALL) {
    activeFilters.push({
      id: "origen",
      label: `Origen: ${origen === "0" ? "Manual" : "Generada"}`,
      onRemove: () => setOrigen(ALL),
    })
  }
  if (sinFecha) {
    activeFilters.push({
      id: "sinFecha",
      label: "Solo sin fecha",
      onRemove: () => setSinFecha(false),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planificación manual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Editá la <code className="text-xs">FechaPlanificada</code> de las tareas a mano. Todo
            cambio guardado queda marcado como <strong>Manual</strong> — el generador respeta esas
            fechas en próximas corridas (salvo que actives "Sobrescribir manuales futuras").
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Importar desde Excel
          </Button>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
          {cambiosCount > 0 && (
            <Button variant="outline" onClick={descartarTodo} className="gap-2" disabled={guardar.isPending}>
              <RotateCcw className="h-4 w-4" />
              Descartar ({cambiosCount})
            </Button>
          )}
          <Button
            onClick={guardarTodo}
            disabled={cambiosCount === 0 || guardar.isPending}
            className="gap-2"
          >
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardar.isPending ? "Guardando..." : `Guardar cambios${cambiosCount > 0 ? ` (${cambiosCount})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Chips de filtros activos */}
      <FiltersChips activeFilters={activeFilters} onClearAll={limpiarFiltros} />

      <ImportFechasSheet open={importOpen} onClose={() => setImportOpen(false)} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {savedMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Filtros dentro de un sheet lateral — mismo patrón que /ejecucion/elementos */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={limpiarFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Sistema">
          <FiltroSelectInline
            value={sistemaId}
            onChange={(v) => { setSistemaId(v); setSubSistemaId("") }}
            opciones={sistemas.map((s) => ({ value: s.id, label: `${s.codigo} · ${s.nombre}` }))}
          />
        </FilterField>
        <FilterField label="Subsistema">
          <FiltroSelectInline
            value={subSistemaId}
            onChange={setSubSistemaId}
            opciones={subSistemas.map((ss) => ({ value: ss.id, label: `${ss.codigo} · ${ss.nombre}` }))}
            disabled={!sistemaId && subSistemas.length === 0}
          />
        </FilterField>
        <FilterField label="Nivel">
          <FiltroSelectInline
            value={nivelId}
            onChange={setNivelId}
            opciones={niveles.map((n) => ({ value: n.id, label: n.nombre }))}
          />
        </FilterField>
        <FilterField label="Especialidad">
          <FiltroSelectInline
            value={especialidadId}
            onChange={handleEspecialidadChange}
            opciones={especialidades.map((e) => ({ value: e.id, label: e.nombre }))}
          />
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
        <FilterField label="Estado">
          <Select value={estado} onValueChange={(v) => setEstado(v ?? ALL)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos">
                {estado === ALL ? "Todos" : (ESTADO_LABELS[Number(estado)] ?? "—")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Origen de la fecha">
          <Select value={origen} onValueChange={(v) => setOrigen(v ?? ALL)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos">
                {origen === ALL ? "Todos" : (origen === "0" ? "Manual" : "Generada")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="0">Manual</SelectItem>
              <SelectItem value="1">Generada</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Otros">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sinFecha}
              onChange={(e) => setSinFecha(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">Solo tareas sin fecha</span>
          </label>
        </FilterField>
      </FiltersSheet>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">TAG</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead className="w-32">Nivel</TableHead>
              <TableHead className="w-24">Subsist.</TableHead>
              <TableHead className="w-40">Tipo</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-40">Ventana</TableHead>
              <TableHead className="w-44">Fecha planificada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filasMostradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay tareas que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              filasMostradas.map((t) => (
                <FilaTarea
                  key={t.elementoTareaId}
                  tarea={t}
                  editado={t._editado}
                  fechaInput={t._fechaInput}
                  onChange={(v) => setEdit(t.elementoTareaId, v || null)}
                  onClear={() => setEdit(t.elementoTareaId, null)}
                  onDescartar={() => descartarFila(t.elementoTareaId)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground gap-3 flex-wrap">
        <span>
          {total} tarea(s) en total{" "}
          {isFetching && !isLoading && <span className="text-xs">(actualizando...)</span>}
        </span>
        <div className="flex items-center gap-3">
          {cambiosCount > 0 && (
            <span className="text-amber-700 font-medium">
              {cambiosCount} cambio(s) sin guardar
            </span>
          )}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

// Variante sin label — el label lo pone `FilterField` del sheet.
function FiltroSelectInline({
  value, onChange, opciones, disabled,
}: {
  value: string
  onChange: (v: string) => void
  opciones: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(!v || v === ALL ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
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
  )
}

type FilaTareaProps = {
  tarea: PlanificacionTareaItem
  editado: boolean
  fechaInput: string
  onChange: (v: string) => void
  onClear: () => void
  onDescartar: () => void
}

function FilaTarea({ tarea, editado, fechaInput, onChange, onClear, onDescartar }: FilaTareaProps) {
  return (
    <TableRow className={editado ? "bg-amber-50/40" : undefined}>
      <TableCell className="font-mono text-xs">{tarea.elementoTag ?? "—"}</TableCell>
      <TableCell className="text-sm">{tarea.tareaNombre ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tarea.nivelNombre ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tarea.subSistemaCodigo ?? "—"}</TableCell>
      <TableCell>
        {tarea.elementoTipoNombre || tarea.especialidadNombre ? (
          <>
            <p className="text-sm text-gray-600">{tarea.elementoTipoNombre ?? "—"}</p>
            {tarea.especialidadNombre && (
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                {tarea.especialidadColor && (
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: tarea.especialidadColor }}
                  />
                )}
                {tarea.especialidadNombre}
              </p>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-600">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {ESTADO_LABELS[tarea.estado] ?? "—"}
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground tabular-nums">
        {tarea.ventanaInicio && tarea.ventanaFin
          ? `${fmtFecha(tarea.ventanaInicio)} → ${fmtFecha(tarea.ventanaFin)}`
          : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={fechaInput}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-36"
          />
          {fechaInput && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-red-600"
              onClick={onClear}
              title="Limpiar fecha"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {editado && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-amber-700"
              onClick={onDescartar}
              title="Descartar cambio"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {!editado && tarea.fechaPlanificada && (
            tarea.fechaPlanificadaOrigen === 1 ? (
              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium ml-auto">
                Generada
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded font-medium ml-auto">
                Manual
              </span>
            )
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
