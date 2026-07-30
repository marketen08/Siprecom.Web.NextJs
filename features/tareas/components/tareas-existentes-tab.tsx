"use client"

import { useMemo, useState } from "react"
import { Loader2, RotateCcw, Trash2, XCircle } from "lucide-react"

import {
  ESTADO_COORD,
  ESTADO_ET,
  ESTADO_ET_LABEL,
  useAsignarResponsableET,
  useCancelarElementoTarea,
  useCoordinacionCounts,
  useDeleteElementoTarea,
  useReactivarElementoTarea,
  useSearchElementosTareas,
  type CoordinacionFiltros,
  type ElementoTareaRow,
  type EstadoCoord,
  type EstadoET,
} from "@/features/tareas/api/use-coordinacion-tareas"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetTareasSelect } from "@/features/tareas/api/use-get-tareas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  FiltersChips, FiltersSheet, FiltersTrigger, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"
const SIN_ASIGNAR = "__none__"
const PAGE_SIZE = 50

export function TareasExistentesTab() {
  // ── Filtros ────────────────────────────────────────────────────────
  // Chip principal (bucket de coordinación). null = "Todas".
  const [estadoCoord, setEstadoCoord] = useState<EstadoCoord | null>(null)

  // Filtros detallados (dentro del sheet).
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [especialidadId, setEspecialidadId] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [tareaId, setTareaId] = useState<string>(ALL)
  const [estadoDetalle, setEstadoDetalle] = useState<string>(ALL)
  const [asignadoA, setAsignadoA] = useState<string>(ALL)
  const [incluirCanceladas, setIncluirCanceladas] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [page, setPage] = useState(1)

  const filtros: CoordinacionFiltros = useMemo(() => ({
    subSistemaId: subSistemaId === ALL ? undefined : subSistemaId,
    nivelId: nivelId === ALL ? undefined : nivelId,
    especialidadId: especialidadId === ALL ? undefined : especialidadId,
    elementoTipoId: elementoTipoId === ALL ? undefined : elementoTipoId,
    tareaId: tareaId === ALL ? undefined : tareaId,
    estados: estadoDetalle === ALL ? undefined : [Number(estadoDetalle) as EstadoET],
    asignadoA: asignadoA === ALL ? undefined : asignadoA,
    estadoCoord: estadoCoord ?? undefined,
    incluirCanceladasRechazadas: incluirCanceladas,
  }), [subSistemaId, nivelId, especialidadId, elementoTipoId, tareaId, estadoDetalle, asignadoA, estadoCoord, incluirCanceladas])

  const { data, isLoading, isFetching } = useSearchElementosTareas(filtros, page, PAGE_SIZE)
  const rows: ElementoTareaRow[] = data?.data ?? []
  const total = data?.totalRecords ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Conteos para los chips — ignoran el filtro estadoCoord para reflejar
  // cuánto entra en cada bucket dado el resto del contexto.
  const { data: counts } = useCoordinacionCounts(filtros)

  // ── Fuentes selects ────────────────────────────────────────────────
  const { data: perfil } = useGetPerfil()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  const { data: subsistemasRaw } = useGetSubSistemasSelect()
  const { data: tiposRaw } = useGetElementosTiposSelect()
  const { data: tareasRaw } = useGetTareasSelect()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()

  const usuarios = usuariosRaw ?? []

  const subsistemaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const s of (subsistemasRaw as any)?.data ?? []) {
      opts.push({ value: s.id, label: s.codigo ? `${s.codigo} — ${s.nombre}` : s.nombre })
    }
    return opts
  }, [subsistemasRaw])

  const tipoOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const t of (tiposRaw as any)?.data ?? []) {
      opts.push({ value: t.id, label: t.nombre })
    }
    return opts
  }, [tiposRaw])

  const tareaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas" }]
    for (const t of (tareasRaw as any)?.data ?? []) {
      opts.push({ value: t.id, label: t.codigo ? `${t.codigo} — ${t.nombre}` : t.nombre })
    }
    return opts
  }, [tareasRaw])

  const nivelOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const n of nivelesRaw?.data ?? []) {
      opts.push({ value: n.id, label: n.nombre })
    }
    return opts
  }, [nivelesRaw])

  const especialidadOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas" }]
    for (const e of especialidadesRaw?.data ?? []) {
      opts.push({ value: e.id, label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre })
    }
    return opts
  }, [especialidadesRaw])

  const usuarioOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Cualquiera" }]
    for (const u of usuarios) {
      const nom = [u.nombre, u.apellido].filter(Boolean).join(" ").trim()
      opts.push({
        value: u.usuarioId,
        label: nom ? `${nom} — ${u.email}` : u.email,
      })
    }
    return opts
  }, [usuarios])

  const usuarioSelectOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: SIN_ASIGNAR, label: "Sin asignar" }]
    for (const u of usuarios) {
      const nom = [u.nombre, u.apellido].filter(Boolean).join(" ").trim()
      opts.push({
        value: u.usuarioId,
        label: nom ? `${nom} — ${u.email}` : u.email,
      })
    }
    return opts
  }, [usuarios])

  const estadoDetalleOptions: ComboboxOption[] = [
    { value: ALL, label: "Todos los estados" },
    { value: String(ESTADO_ET.PENDIENTE), label: "Pendiente" },
    { value: String(ESTADO_ET.EN_PROCESO), label: "En proceso" },
    { value: String(ESTADO_ET.COMPLETADO), label: "Completado" },
    { value: String(ESTADO_ET.APROBADO), label: "Firmado físico" },
    { value: String(ESTADO_ET.FIRMADO), label: "Firmado" },
    { value: String(ESTADO_ET.RECHAZADO), label: "Rechazado" },
    { value: String(ESTADO_ET.CANCELADO), label: "Cancelado" },
  ]

  // ── Chips de filtros activos (los del sheet) ───────────────────────
  const activeFilters: FilterChip[] = []
  const chip = (id: string, key: string, value: string, onRemove: () => void) =>
    activeFilters.push({ id, label: `${key}: ${value}`, onRemove })

  if (subSistemaId !== ALL) {
    chip("sub", "Subsistema", subsistemaOptions.find((o) => o.value === subSistemaId)?.label ?? subSistemaId, () => setSubSistemaId(ALL))
  }
  if (nivelId !== ALL) {
    chip("niv", "Nivel", nivelOptions.find((o) => o.value === nivelId)?.label ?? nivelId, () => setNivelId(ALL))
  }
  if (especialidadId !== ALL) {
    chip("esp", "Especialidad", especialidadOptions.find((o) => o.value === especialidadId)?.label ?? especialidadId, () => setEspecialidadId(ALL))
  }
  if (elementoTipoId !== ALL) {
    chip("tipo", "Tipo", tipoOptions.find((o) => o.value === elementoTipoId)?.label ?? elementoTipoId, () => setElementoTipoId(ALL))
  }
  if (tareaId !== ALL) {
    chip("tar", "Tarea", tareaOptions.find((o) => o.value === tareaId)?.label ?? tareaId, () => setTareaId(ALL))
  }
  if (estadoDetalle !== ALL) {
    chip("est", "Estado", estadoDetalleOptions.find((o) => o.value === estadoDetalle)?.label ?? estadoDetalle, () => setEstadoDetalle(ALL))
  }
  if (asignadoA !== ALL) {
    chip("resp", "Responsable", usuarioOptions.find((o) => o.value === asignadoA)?.label ?? asignadoA, () => setAsignadoA(ALL))
  }
  if (incluirCanceladas) {
    chip("canc", "Incluye", "canceladas/rechazadas", () => setIncluirCanceladas(false))
  }

  const limpiarFiltros = () => {
    setSubSistemaId(ALL); setNivelId(ALL); setEspecialidadId(ALL)
    setElementoTipoId(ALL); setTareaId(ALL); setEstadoDetalle(ALL); setAsignadoA(ALL)
    setIncluirCanceladas(false)
    setPage(1)
  }

  // ── Mutations ──────────────────────────────────────────────────────
  const eliminarMut = useDeleteElementoTarea()
  const cancelarMut = useCancelarElementoTarea()
  const asignarMut = useAsignarResponsableET()
  const reactivarMut = useReactivarElementoTarea()

  const [cancelarTarget, setCancelarTarget] = useState<ElementoTareaRow | null>(null)
  const [motivoCancelar, setMotivoCancelar] = useState("")

  const confirmarCancelacion = async () => {
    if (!cancelarTarget || !motivoCancelar.trim()) return
    try {
      await cancelarMut.mutateAsync({ id: cancelarTarget.id, motivo: motivoCancelar.trim() })
      setCancelarTarget(null); setMotivoCancelar("")
    } catch { /* mensaje visible abajo */ }
  }

  const setChip = (nuevo: EstadoCoord | null) => {
    setEstadoCoord(nuevo)
    setPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Barra superior: chips + botón Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <ChipBucket
          active={estadoCoord === null}
          label="Todas"
          count={counts?.total}
          tone="gray"
          onClick={() => setChip(null)}
        />
        <ChipBucket
          active={estadoCoord === ESTADO_COORD.PENDIENTE}
          label="Pendiente"
          count={counts?.pendiente}
          tone="amber"
          onClick={() => setChip(ESTADO_COORD.PENDIENTE)}
        />
        <ChipBucket
          active={estadoCoord === ESTADO_COORD.ASIGNADA}
          label="Asignada"
          count={counts?.asignada}
          tone="blue"
          onClick={() => setChip(ESTADO_COORD.ASIGNADA)}
        />
        <ChipBucket
          active={estadoCoord === ESTADO_COORD.COMPLETADA_FIRMADA}
          label="Completada / Firmada"
          count={counts?.completadaFirmada}
          tone="green"
          onClick={() => setChip(ESTADO_COORD.COMPLETADA_FIRMADA)}
        />

        <div className="ml-auto">
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
        </div>
      </div>

      <FiltersChips activeFilters={activeFilters} onClearAll={limpiarFiltros} />

      {/* Paginación / conteo */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{total} tarea(s) — página {page} de {totalPages}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </div>
      </div>

      <DataTableWrapper isFetching={isFetching && !isLoading}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Elemento (TAG)</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Fecha planif.</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Cargando...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Sin resultados con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const puedeEliminar = row.estado === ESTADO_ET.PENDIENTE || row.estado === ESTADO_ET.CANCELADO
                const puedeCancelar = row.estado === ESTADO_ET.PENDIENTE || row.estado === ESTADO_ET.EN_PROCESO
                const puedeReactivar = row.estado === ESTADO_ET.CANCELADO
                return (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm font-medium">{row.elementoTag ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.tareaNombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.nivelNombre ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <EstadoBadge estado={row.estado} />
                    </TableCell>
                    <TableCell className="text-sm w-64">
                      <Combobox
                        options={usuarioSelectOptions}
                        value={row.asignadoA ?? SIN_ASIGNAR}
                        onChange={(v) => {
                          const nuevo = v === SIN_ASIGNAR ? null : v
                          asignarMut.mutate({ id: row.id, asignadoA: nuevo })
                        }}
                        placeholder="Sin asignar"
                        searchPlaceholder="Buscar usuario..."
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.fechaPlanificada ? new Date(row.fechaPlanificada).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {puedeReactivar && (
                          <ConfirmActionDialog
                            trigger={<RotateCcw className="h-4 w-4" />}
                            triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-emerald-700 hover:bg-accent cursor-pointer"
                            title="¿Reactivar tarea?"
                            description={
                              <>
                                La tarea <strong>{row.tareaNombre}</strong> del elemento{" "}
                                <strong>{row.elementoTag}</strong> volverá al estado{" "}
                                <strong>PENDIENTE</strong> y se limpiará el motivo de cancelación.
                                Requiere que el Elemento y la Tarea sigan activos.
                              </>
                            }
                            confirmText="Reactivar"
                            pendingText="Reactivando..."
                            onConfirm={() => reactivarMut.mutateAsync(row.id)}
                          />
                        )}
                        {puedeCancelar && (
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 text-amber-700"
                            title="Cancelar tarea"
                            onClick={() => { setCancelarTarget(row); setMotivoCancelar("") }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmActionDialog
                            trigger={<Trash2 className="h-4 w-4" />}
                            triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent cursor-pointer"
                            title="¿Eliminar tarea?"
                            description={
                              <>
                                Se eliminará la tarea <strong>{row.tareaNombre}</strong> del elemento{" "}
                                <strong>{row.elementoTag}</strong>. Solo se permite eliminar tareas
                                PENDIENTE o CANCELADO.
                              </>
                            }
                            confirmText="Eliminar"
                            pendingText="Eliminando..."
                            variant="destructive"
                            onConfirm={() => eliminarMut.mutateAsync(row.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {asignarMut.error && (
        <p className="text-xs text-destructive">{(asignarMut.error as Error).message}</p>
      )}
      {eliminarMut.error && (
        <p className="text-xs text-destructive">{(eliminarMut.error as Error).message}</p>
      )}
      {reactivarMut.error && (
        <p className="text-xs text-destructive">{(reactivarMut.error as Error).message}</p>
      )}

      {/* Sheet de filtros detallados */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={limpiarFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Subsistema">
          <Combobox options={subsistemaOptions} value={subSistemaId}
            onChange={(v) => { setSubSistemaId(v); setPage(1) }}
            placeholder="Todos" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Nivel">
          <Combobox options={nivelOptions} value={nivelId}
            onChange={(v) => { setNivelId(v); setPage(1) }}
            placeholder="Todos" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Especialidad">
          <Combobox options={especialidadOptions} value={especialidadId}
            onChange={(v) => { setEspecialidadId(v); setPage(1) }}
            placeholder="Todas" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Tipo de elemento">
          <Combobox options={tipoOptions} value={elementoTipoId}
            onChange={(v) => { setElementoTipoId(v); setPage(1) }}
            placeholder="Todos" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Tarea">
          <Combobox options={tareaOptions} value={tareaId}
            onChange={(v) => { setTareaId(v); setPage(1) }}
            placeholder="Todas" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Estado detallado">
          <Combobox options={estadoDetalleOptions} value={estadoDetalle}
            onChange={(v) => { setEstadoDetalle(v); setPage(1) }}
            placeholder="Todos" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Responsable">
          <Combobox options={usuarioOptions} value={asignadoA}
            onChange={(v) => { setAsignadoA(v); setPage(1) }}
            placeholder="Cualquiera" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Otros">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={incluirCanceladas}
              onChange={(e) => { setIncluirCanceladas(e.target.checked); setPage(1) }}
              className="h-4 w-4 rounded border-input"
            />
            Incluir tareas canceladas y rechazadas
          </label>
        </FilterField>
      </FiltersSheet>

      {/* Dialog de cancelación con motivo obligatorio */}
      <AlertDialog open={cancelarTarget !== null} onOpenChange={(v) => { if (!v) setCancelarTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar tarea</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como <strong>CANCELADO</strong>. La tarea queda visible en el histórico pero
              no se ejecuta. Se requiere un motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Tarea: <strong>{cancelarTarget?.tareaNombre}</strong> — Elemento{" "}
              <strong>{cancelarTarget?.elementoTag}</strong>
            </p>
            <label className="text-sm font-medium">Motivo *</label>
            <Textarea
              value={motivoCancelar}
              onChange={(e) => setMotivoCancelar(e.target.value)}
              placeholder="Ej.: no aplica al elemento, error de propagación, cambio de alcance..."
              rows={3}
            />
            {cancelarMut.error && (
              <p className="text-xs text-destructive">{(cancelarMut.error as Error).message}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelarMut.isPending}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!motivoCancelar.trim() || cancelarMut.isPending}
              onClick={(e) => { e.preventDefault(); confirmarCancelacion() }}
            >
              {cancelarMut.isPending ? "Cancelando..." : "Confirmar cancelación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Chip visual del bucket ───────────────────────────────────────────
interface ChipBucketProps {
  active: boolean
  label: string
  count: number | undefined
  tone: "gray" | "amber" | "blue" | "green"
  onClick: () => void
}
function ChipBucket({ active, label, count, tone, onClick }: ChipBucketProps) {
  const inactive: Record<string, string> = {
    gray:  "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
    amber: "bg-white text-amber-900 border-amber-300 hover:bg-amber-50",
    blue:  "bg-white text-blue-900 border-blue-300 hover:bg-blue-50",
    green: "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50",
  }
  const activeCls: Record<string, string> = {
    gray:  "bg-gray-800 text-white border-gray-800",
    amber: "bg-amber-600 text-white border-amber-600",
    blue:  "bg-blue-700 text-white border-blue-700",
    green: "bg-emerald-700 text-white border-emerald-700",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors cursor-pointer " +
        (active ? activeCls[tone] : inactive[tone])
      }
    >
      {label}
      {typeof count === "number" && (
        <span className={
          "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold " +
          (active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-700")
        }>
          {count}
        </span>
      )}
    </button>
  )
}

function EstadoBadge({ estado }: { estado: EstadoET }) {
  const tone: Record<number, string> = {
    1: "bg-gray-100 text-gray-700",
    2: "bg-blue-100 text-blue-800",
    3: "bg-green-100 text-green-800",
    4: "bg-emerald-100 text-emerald-800",
    5: "bg-red-100 text-red-800",
    6: "bg-slate-200 text-slate-700 line-through",
    7: "bg-emerald-100 text-emerald-800",
  }
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${tone[estado] ?? ""}`}>
      {ESTADO_ET_LABEL[estado]}
    </span>
  )
}
