"use client"

import { useMemo, useState } from "react"
import { Loader2, RotateCcw, Trash2, XCircle } from "lucide-react"

import {
  ESTADO_ET,
  ESTADO_ET_LABEL,
  useAsignarResponsableET,
  useCancelarElementoTarea,
  useDeleteElementoTarea,
  useReactivarElementoTarea,
  useSearchElementosTareas,
  type CoordinacionFiltros,
  type ElementoTareaRow,
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
  // ── Filtros locales ────────────────────────────────────────────────
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [especialidadId, setEspecialidadId] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [tareaId, setTareaId] = useState<string>(ALL)
  const [estado, setEstado] = useState<string>(ALL)
  const [asignadoA, setAsignadoA] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const filtros: CoordinacionFiltros = useMemo(() => ({
    subSistemaId: subSistemaId === ALL ? undefined : subSistemaId,
    nivelId: nivelId === ALL ? undefined : nivelId,
    especialidadId: especialidadId === ALL ? undefined : especialidadId,
    elementoTipoId: elementoTipoId === ALL ? undefined : elementoTipoId,
    tareaId: tareaId === ALL ? undefined : tareaId,
    estados: estado === ALL ? undefined : [Number(estado) as EstadoET],
    asignadoA: asignadoA === ALL ? undefined : asignadoA,
  }), [subSistemaId, nivelId, especialidadId, elementoTipoId, tareaId, estado, asignadoA])

  const { data, isLoading, isFetching } = useSearchElementosTareas(filtros, page, PAGE_SIZE)
  const rows: ElementoTareaRow[] = data?.data ?? []
  const total = data?.totalRecords ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Fuentes para filtros/selects.
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
    // Igual que arriba, pero con "Sin asignar" en vez de "Cualquiera" (para editar por fila).
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

  const estadoOptions: ComboboxOption[] = [
    { value: ALL, label: "Todos los estados" },
    { value: String(ESTADO_ET.PENDIENTE), label: "Pendiente" },
    { value: String(ESTADO_ET.EN_PROCESO), label: "En proceso" },
    { value: String(ESTADO_ET.COMPLETADO), label: "Completado" },
    { value: String(ESTADO_ET.APROBADO), label: "Firmado físico" },
    { value: String(ESTADO_ET.FIRMADO), label: "Firmado" },
    { value: String(ESTADO_ET.RECHAZADO), label: "Rechazado" },
    { value: String(ESTADO_ET.CANCELADO), label: "Cancelado" },
  ]

  // ── Mutations ──────────────────────────────────────────────────────
  const eliminarMut = useDeleteElementoTarea()
  const cancelarMut = useCancelarElementoTarea()
  const asignarMut = useAsignarResponsableET()
  const reactivarMut = useReactivarElementoTarea()

  // Dialog de cancelación (requiere motivo).
  const [cancelarTarget, setCancelarTarget] = useState<ElementoTareaRow | null>(null)
  const [motivoCancelar, setMotivoCancelar] = useState("")

  const confirmarCancelacion = async () => {
    if (!cancelarTarget || !motivoCancelar.trim()) return
    try {
      await cancelarMut.mutateAsync({ id: cancelarTarget.id, motivo: motivoCancelar.trim() })
      setCancelarTarget(null)
      setMotivoCancelar("")
    } catch (e) {
      // el error queda visible al no cerrar el dialog; el mensaje del server se ve abajo.
    }
  }

  const resetFiltros = () => {
    setSubSistemaId(ALL); setNivelId(ALL); setEspecialidadId(ALL)
    setElementoTipoId(ALL); setTareaId(ALL); setEstado(ALL); setAsignadoA(ALL)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Todas las ElementoTareas del proyecto con acciones de <strong>eliminar</strong> (solo PENDIENTES
        o CANCELADAS), <strong>cancelar</strong> (con motivo, para PENDIENTE o EN_PROCESO) y{" "}
        <strong>asignar responsable</strong>.
      </p>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <FiltroLabel label="Subsistema">
          <Combobox options={subsistemaOptions} value={subSistemaId} onChange={(v) => { setSubSistemaId(v); setPage(1) }} placeholder="Todos" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Nivel">
          <Combobox options={nivelOptions} value={nivelId} onChange={(v) => { setNivelId(v); setPage(1) }} placeholder="Todos" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Especialidad">
          <Combobox options={especialidadOptions} value={especialidadId} onChange={(v) => { setEspecialidadId(v); setPage(1) }} placeholder="Todas" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Tipo de elemento">
          <Combobox options={tipoOptions} value={elementoTipoId} onChange={(v) => { setElementoTipoId(v); setPage(1) }} placeholder="Todos" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Tarea">
          <Combobox options={tareaOptions} value={tareaId} onChange={(v) => { setTareaId(v); setPage(1) }} placeholder="Todas" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Estado">
          <Combobox options={estadoOptions} value={estado} onChange={(v) => { setEstado(v); setPage(1) }} placeholder="Todos" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <FiltroLabel label="Responsable">
          <Combobox options={usuarioOptions} value={asignadoA} onChange={(v) => { setAsignadoA(v); setPage(1) }} placeholder="Cualquiera" searchPlaceholder="Buscar..." />
        </FiltroLabel>
        <div className="flex items-end">
          <Button variant="outline" onClick={resetFiltros} className="w-full">Limpiar filtros</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {total} tarea(s) — página {page} de {totalPages}
        </span>
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

function FiltroLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
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
