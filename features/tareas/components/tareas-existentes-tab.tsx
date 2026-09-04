"use client"

import { useMemo, useState } from "react"
import { Loader2, RotateCcw, Trash2, XCircle } from "lucide-react"

import {
  ESTADO_COORD,
  ESTADO_ET,
  ESTADO_ET_LABEL,
  useActualizarFechaPlanificadaET,
  useAsignarResponsableET,
  useBulkActualizarFechaPlanificada,
  useBulkAsignar,
  useBulkCancelar,
  useBulkReactivar,
  useCancelarElementoTarea,
  useCoordinacionCounts,
  useDeleteElementoTarea,
  useReactivarElementoTarea,
  useSearchElementosTareas,
  type BulkResult,
  type BulkTargets,
  type CoordinacionFiltros,
  type ElementoTareaRow,
  type EstadoCoord,
  type EstadoET,
} from "@/features/tareas/api/use-coordinacion-tareas"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetTareasSelect, useGetTareasUsadasSelect } from "@/features/tareas/api/use-get-tareas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
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

// Chips de bucket disponibles arriba de la tabla. "canceladas" NO está en el
// enum backend EstadoCoord — se traduce a estados=[CANCELADO] +
// incluirCanceladasRechazadas=true (para saltar la exclusión default).
type ChipBucketId = "pendientes" | "no-asignadas" | "asignadas" | "completadas" | "canceladas" | "todas"

export function TareasExistentesTab() {
  // ── Filtros ────────────────────────────────────────────────────────
  // Chip principal. Default: Pendientes — la vista natural del coordinador
  // al entrar (todo lo no terminal, asignado o no).
  const [chipActivo, setChipActivo] = useState<ChipBucketId>("pendientes")

  // Deriva el bucket de coordinación backend (undefined para "canceladas" y "todas").
  const estadoCoord: EstadoCoord | null =
    chipActivo === "pendientes" ? ESTADO_COORD.PENDIENTES
    : chipActivo === "no-asignadas" ? ESTADO_COORD.PENDIENTE
    : chipActivo === "asignadas" ? ESTADO_COORD.ASIGNADA
    : chipActivo === "completadas" ? ESTADO_COORD.COMPLETADA_FIRMADA
    : null

  // Filtros detallados (dentro del sheet).
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [especialidadId, setEspecialidadId] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [tareaNombre, setTareaNombre] = useState<string>(ALL)
  const [estadoDetalle, setEstadoDetalle] = useState<string>(ALL)
  const [asignadoA, setAsignadoA] = useState<string>(ALL)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [page, setPage] = useState(1)

  const filtros: CoordinacionFiltros = useMemo(() => {
    // Chip Canceladas: forzamos estados=[CANCELADO] + incluir=true (para saltar la
    // exclusión default del backend). Prevalece sobre el filtro de estado detallado.
    const esChipCanceladas = chipActivo === "canceladas"
    return {
      subSistemaId: subSistemaId === ALL ? undefined : subSistemaId,
      nivelId: nivelId === ALL ? undefined : nivelId,
      especialidadId: especialidadId === ALL ? undefined : especialidadId,
      elementoTipoId: elementoTipoId === ALL ? undefined : elementoTipoId,
      tareaNombre: tareaNombre === ALL ? undefined : tareaNombre,
      estados: esChipCanceladas
        ? [ESTADO_ET.CANCELADO]
        : estadoDetalle === ALL ? undefined : [Number(estadoDetalle) as EstadoET],
      asignadoA: asignadoA === ALL ? undefined : asignadoA,
      estadoCoord: estadoCoord ?? undefined,
      // Solo el chip Canceladas fuerza incluir=true — para las Rechazadas, el user
      // usa el filtro Estado detallado del sheet (que ya levanta la exclusión).
      incluirCanceladasRechazadas: esChipCanceladas,
    }
  }, [chipActivo, subSistemaId, nivelId, especialidadId, elementoTipoId, tareaNombre, estadoDetalle, asignadoA, estadoCoord])

  const { data, isLoading, isFetching } = useSearchElementosTareas(filtros, page, PAGE_SIZE)
  const rows: ElementoTareaRow[] = data?.data ?? []
  const total = data?.total ?? 0
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
  const { data: tareasUsadas } = useGetTareasUsadasSelect()
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

  // Tipos filtrados por Especialidad (si hay una elegida). Cascada Esp → Tipo.
  const tipoOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todos" }]
    for (const t of (tiposRaw as any)?.data ?? []) {
      if (especialidadId !== ALL && t.especialidadId !== especialidadId) continue
      opts.push({ value: t.id, label: t.nombre })
    }
    return opts
  }, [tiposRaw, especialidadId])

  // Tareas dedup por Nombre + cascada Esp/Tipo. El filtro backend usa TareaNombre
  // (case-insensitive) para agarrar a todas las que matcheen ese nombre. Cuando hay
  // Especialidad/Tipo activos, acotamos las opciones para no ofrecer nombres que
  // no van a devolver nada. Chequeamos contra `especialidadId` directa de la
  // Tarea O contra `elementoTipoId` si la Tarea no tiene especialidad propia.
  const tiposIdsDeEspecialidad = useMemo(() => {
    if (especialidadId === ALL) return null
    const set = new Set<string>()
    for (const t of (tiposRaw as any)?.data ?? []) {
      if (t.especialidadId === especialidadId) set.add(t.id)
    }
    return set
  }, [tiposRaw, especialidadId])

  // Set de nombres que efectivamente tienen ET en el proyecto — usados
  // como "whitelist": solo esos nombres aparecen en el select.
  const nombresUsadosSet = useMemo(() => {
    const s = new Set<string>()
    for (const n of tareasUsadas ?? []) s.add(n.toLowerCase())
    return s
  }, [tareasUsadas])

  const tareaOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas" }]
    const nombresVistos = new Set<string>()
    const lista: string[] = []
    for (const t of (tareasRaw as any)?.data ?? []) {
      const nom = (t.nombre ?? "").trim()
      if (!nom) continue
      const key = nom.toLowerCase()
      // Whitelist: solo tareas que tienen al menos una ET activa en el proyecto.
      if (!nombresUsadosSet.has(key)) continue
      // Cascada Tipo: si hay tipo elegido, la tarea debe ser de ese tipo.
      if (elementoTipoId !== ALL && t.elementoTipoId !== elementoTipoId) continue
      // Cascada Especialidad: matchea contra .especialidadId directa o vía el tipo.
      if (tiposIdsDeEspecialidad) {
        const esp = t.especialidadId
        const tipo = t.elementoTipoId
        const matchDirecto = esp && esp === especialidadId
        const matchViaTipo = tipo && tiposIdsDeEspecialidad.has(tipo)
        if (!matchDirecto && !matchViaTipo) continue
      }
      if (nombresVistos.has(key)) continue
      nombresVistos.add(key)
      lista.push(nom)
    }
    lista.sort((a, b) => a.localeCompare(b, "es"))
    for (const nom of lista) opts.push({ value: nom, label: nom })
    return opts
  }, [tareasRaw, nombresUsadosSet, elementoTipoId, tiposIdsDeEspecialidad, especialidadId])

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
  if (tareaNombre !== ALL) {
    chip("tar", "Tarea", tareaNombre, () => setTareaNombre(ALL))
  }
  if (estadoDetalle !== ALL) {
    chip("est", "Estado", estadoDetalleOptions.find((o) => o.value === estadoDetalle)?.label ?? estadoDetalle, () => setEstadoDetalle(ALL))
  }
  if (asignadoA !== ALL) {
    chip("resp", "Responsable", usuarioOptions.find((o) => o.value === asignadoA)?.label ?? asignadoA, () => setAsignadoA(ALL))
  }

  const limpiarFiltros = () => {
    setSubSistemaId(ALL); setNivelId(ALL); setEspecialidadId(ALL)
    setElementoTipoId(ALL); setTareaNombre(ALL); setEstadoDetalle(ALL); setAsignadoA(ALL)
    setPage(1)
  }

  // ── Mutations ──────────────────────────────────────────────────────
  const eliminarMut = useDeleteElementoTarea()
  const cancelarMut = useCancelarElementoTarea()
  const asignarMut = useAsignarResponsableET()
  const reactivarMut = useReactivarElementoTarea()
  const fechaMut = useActualizarFechaPlanificadaET()

  const bulkAsignarMut = useBulkAsignar()
  const bulkCancelarMut = useBulkCancelar()
  const bulkReactivarMut = useBulkReactivar()
  const bulkFechaMut = useBulkActualizarFechaPlanificada()

  // ── Selección multi-fila ───────────────────────────────────────────
  // Modo IDs: acumula IDs entre páginas. Modo "matching filter": booleano —
  // el user seleccionó "todas las N que matchean el filtro" (cross-página).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  // Al cambiar de filtros, limpiar selección para evitar operar sobre lo que ya no ves.
  const filtrosKey = JSON.stringify(filtros)
  const [prevFiltrosKey, setPrevFiltrosKey] = useState(filtrosKey)
  if (filtrosKey !== prevFiltrosKey) {
    setPrevFiltrosKey(filtrosKey)
    if (selectedIds.size > 0 || selectAllMatching) {
      setSelectedIds(new Set())
      setSelectAllMatching(false)
    }
  }

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows])
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const pageSomeSelected = pageIds.some((id) => selectedIds.has(id))

  const togglePageAll = () => {
    if (selectAllMatching) {
      // Salir del modo cross-página: limpia todo.
      setSelectAllMatching(false)
      setSelectedIds(new Set())
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (pageAllSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleRow = (id: string) => {
    if (selectAllMatching) {
      // Deseleccionar UNA fila cuando está en modo cross-página: salir del modo
      // y quedarnos con todas las de esta página menos la desmarcada. UX simple.
      setSelectAllMatching(false)
      setSelectedIds(new Set(pageIds.filter((x) => x !== id)))
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectionCount = selectAllMatching ? total : selectedIds.size
  const hasSelection = selectionCount > 0

  const buildBulkTargets = (): BulkTargets =>
    selectAllMatching ? { filter: filtros } : { ids: Array.from(selectedIds) }

  // ── Dialogs bulk ────────────────────────────────────────────────────
  const [bulkAsignarOpen, setBulkAsignarOpen] = useState(false)
  const [bulkAsignarUser, setBulkAsignarUser] = useState<string>(SIN_ASIGNAR)
  const [bulkCancelarOpen, setBulkCancelarOpen] = useState(false)
  const [bulkCancelarMotivo, setBulkCancelarMotivo] = useState("")
  const [bulkReactivarOpen, setBulkReactivarOpen] = useState(false)
  const [bulkFechaOpen, setBulkFechaOpen] = useState(false)
  const [bulkFecha, setBulkFecha] = useState("")

  // ── Resumen post-acción ─────────────────────────────────────────────
  const [bulkResumen, setBulkResumen] = useState<{ accion: string; result: BulkResult } | null>(null)
  const [rechazosOpen, setRechazosOpen] = useState(false)

  const limpiarSeleccion = () => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  const ejecutarBulkAsignar = async () => {
    try {
      const nuevo = bulkAsignarUser === SIN_ASIGNAR ? null : bulkAsignarUser
      const result = await bulkAsignarMut.mutateAsync({ ...buildBulkTargets(), asignadoA: nuevo })
      setBulkResumen({ accion: "Asignación", result })
      setBulkAsignarOpen(false)
      setBulkAsignarUser(SIN_ASIGNAR)
      limpiarSeleccion()
    } catch { /* error visible abajo */ }
  }
  const ejecutarBulkCancelar = async () => {
    if (!bulkCancelarMotivo.trim()) return
    try {
      const result = await bulkCancelarMut.mutateAsync({ ...buildBulkTargets(), motivo: bulkCancelarMotivo.trim() })
      setBulkResumen({ accion: "Cancelación", result })
      setBulkCancelarOpen(false)
      setBulkCancelarMotivo("")
      limpiarSeleccion()
    } catch { /* error visible abajo */ }
  }
  const ejecutarBulkReactivar = async () => {
    try {
      const result = await bulkReactivarMut.mutateAsync(buildBulkTargets())
      setBulkResumen({ accion: "Reactivación", result })
      setBulkReactivarOpen(false)
      limpiarSeleccion()
    } catch { /* error visible abajo */ }
  }
  // `limpiar` es una acción aparte del confirmar normal: sobre un lote (que puede
  // ser "todas las que matchean el filtro") borrar no puede ser el efecto de dejar
  // un input vacío.
  const ejecutarBulkFecha = async (limpiar = false) => {
    if (!limpiar && !bulkFecha) return
    try {
      const result = await bulkFechaMut.mutateAsync({
        ...buildBulkTargets(),
        fechaPlanificada: limpiar ? null : bulkFecha,
      })
      setBulkResumen({
        accion: limpiar ? "Fecha planificada quitada" : "Cambio de fecha planificada",
        result,
      })
      setBulkFechaOpen(false)
      setBulkFecha("")
      limpiarSeleccion()
    } catch { /* error visible abajo */ }
  }

  const [cancelarTarget, setCancelarTarget] = useState<ElementoTareaRow | null>(null)
  const [motivoCancelar, setMotivoCancelar] = useState("")

  /**
   * Al aplicar una acción individual que "saca" la fila de la vista actual
   * (cancelar / eliminar / reactivar) — típicamente porque el chip activo la
   * filtra afuera — hay que sacar el ID de la selección para no dejar "IDs
   * zombies" que aparezcan en la toolbar contextual sin fila visible.
   */
  const removerDeSeleccion = (id: string) => {
    if (selectAllMatching) return // el modo cross-página no se ve afectado por acciones single
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const confirmarCancelacion = async () => {
    if (!cancelarTarget || !motivoCancelar.trim()) return
    try {
      const id = cancelarTarget.id
      await cancelarMut.mutateAsync({ id, motivo: motivoCancelar.trim() })
      removerDeSeleccion(id)
      setCancelarTarget(null); setMotivoCancelar("")
    } catch { /* mensaje visible abajo */ }
  }

  const setChip = (nuevo: ChipBucketId) => {
    setChipActivo(nuevo)
    setPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Barra superior: chips + botón Filtros.
          Orden: Pendiente (default) → Asignada → Completada/Firmada → Todas.
          "Todas" al final porque es la opción "quitar filtro", no la primaria. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipBucket
          active={chipActivo === "pendientes"}
          label="Pendientes"
          count={counts?.pendientes}
          tone="amber"
          onClick={() => setChip("pendientes")}
        />
        <ChipBucket
          active={chipActivo === "no-asignadas"}
          label="No asignadas"
          count={counts?.pendiente}
          tone="amber"
          onClick={() => setChip("no-asignadas")}
        />
        <ChipBucket
          active={chipActivo === "asignadas"}
          label="Asignadas"
          count={counts?.asignada}
          tone="blue"
          onClick={() => setChip("asignadas")}
        />
        <ChipBucket
          active={chipActivo === "completadas"}
          label="Completadas / Firmadas"
          count={counts?.completadaFirmada}
          tone="green"
          onClick={() => setChip("completadas")}
        />
        <ChipBucket
          active={chipActivo === "canceladas"}
          label="Canceladas"
          count={counts?.canceladas}
          tone="red"
          onClick={() => setChip("canceladas")}
        />
        <ChipBucket
          active={chipActivo === "todas"}
          label="Todas"
          count={counts?.total}
          tone="gray"
          onClick={() => setChip("todas")}
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

      {/* Toolbar contextual bulk (sticky abajo del header, solo si hay selección) */}
      {hasSelection && (
        <div className="sticky top-14 z-30 flex flex-col lg:flex-row lg:items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 shadow-sm">
          <span className="text-sm text-blue-900">
            <strong>{selectionCount}</strong> tarea(s) seleccionada(s)
            {selectAllMatching && <span className="ml-1 text-xs">(todas las que matchean el filtro)</span>}
          </span>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setBulkAsignarUser(SIN_ASIGNAR); setBulkAsignarOpen(true) }}>
              Asignar
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkFecha(""); setBulkFechaOpen(true) }}>
              Fecha planif.
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkCancelarMotivo(""); setBulkCancelarOpen(true) }}>
              Cancelar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkReactivarOpen(true)}>
              Reactivar
            </Button>
            <Button size="sm" variant="ghost" onClick={limpiarSeleccion}>Limpiar</Button>
          </div>
        </div>
      )}

      {/* Banner "select all matching filter" — aparece cuando el user marcó
          toda la página y hay más filas fuera de la página actual. Un click
          expande la selección a las N que matchean el filtro (cross-página). */}
      {pageAllSelected && !selectAllMatching && total > pageIds.length && (
        <div className="rounded-md border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm text-blue-900 flex items-center gap-3">
          <span>Seleccionaste las <strong>{pageIds.length}</strong> tareas de esta página.</span>
          <button
            type="button"
            className="text-blue-700 underline hover:no-underline font-medium"
            onClick={() => { setSelectAllMatching(true); setSelectedIds(new Set()) }}
          >
            Seleccionar las {total} que matchean el filtro
          </button>
        </div>
      )}

      {/* Banner de resumen de la última acción bulk */}
      {bulkResumen && (
        <div className={
          "rounded-md border px-3 py-2 text-sm flex items-center gap-3 " +
          (bulkResumen.result.rechazadas.length > 0
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900")
        }>
          <span>
            <strong>{bulkResumen.accion}</strong>: {bulkResumen.result.ok} procesada(s)
            {bulkResumen.result.rechazadas.length > 0 && (
              <> · <strong>{bulkResumen.result.rechazadas.length}</strong> no procesada(s)</>
            )}
            <> de {bulkResumen.result.total}.</>
          </span>
          {bulkResumen.result.rechazadas.length > 0 && (
            <button
              type="button"
              className="ml-1 underline hover:no-underline text-amber-800 font-medium"
              onClick={() => setRechazosOpen(true)}
            >
              Ver detalles
            </button>
          )}
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setBulkResumen(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards (mobile + tablet, < 1024px) — patrón /ejecucion/elementos */}
      <div className="lg:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            Sin resultados con los filtros actuales.
          </div>
        ) : (
          rows.map((row) => {
            const puedeEliminar = row.estado === ESTADO_ET.PENDIENTE || row.estado === ESTADO_ET.CANCELADO
            const puedeCancelar = row.estado === ESTADO_ET.PENDIENTE || row.estado === ESTADO_ET.EN_PROCESO
            const puedeReactivar = row.estado === ESTADO_ET.CANCELADO
            const rowSelected = selectAllMatching || selectedIds.has(row.id)
            return (
              <div
                key={row.id}
                className={
                  "rounded-lg border bg-white p-3 space-y-2 " +
                  (rowSelected ? "border-blue-300 bg-blue-50/40" : "")
                }
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={rowSelected}
                    onChange={() => toggleRow(row.id)}
                    aria-label="Seleccionar tarea"
                    className="h-4 w-4 mt-1 rounded border-input shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gray-500 truncate">{row.elementoTag ?? "—"}</p>
                    <p className="font-medium truncate">{row.tareaNombre ?? "—"}</p>
                    {row.nivelNombre && (
                      <p className="text-xs text-gray-500 truncate">{row.nivelNombre}</p>
                    )}
                  </div>
                  <EstadoBadge estado={row.estado} />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Responsable</label>
                    <div className="whitespace-normal">
                      <Combobox
                        options={usuarioSelectOptions}
                        value={row.asignadoA ?? SIN_ASIGNAR}
                        onChange={(v) => {
                          const nuevo = v === SIN_ASIGNAR ? null : v
                          asignarMut.mutate({ id: row.id, asignadoA: nuevo })
                        }}
                        placeholder="Sin asignar"
                        searchPlaceholder="Buscar..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fecha planif.</label>
                    <Input
                      type="date"
                      value={row.fechaPlanificada ? row.fechaPlanificada.substring(0, 10) : ""}
                      onChange={(e) => {
                        const nueva = e.target.value
                        // Vaciar el input limpia la fecha. Es una sola fila y se
                        // deshace escribiendo otra, así que acá no hace falta la
                        // acción explícita que sí pide el bulk.
                        if (!nueva) {
                          if (!row.fechaPlanificada) return
                          fechaMut.mutate({ id: row.id, fecha: null })
                          return
                        }
                        if (nueva === row.fechaPlanificada?.substring(0, 10)) return
                        fechaMut.mutate({ id: row.id, fecha: nueva })
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {(puedeReactivar || puedeCancelar || puedeEliminar) && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t">
                    {puedeReactivar && (
                      <ConfirmActionDialog
                        trigger={<><RotateCcw className="h-3.5 w-3.5" /> Reactivar</>}
                        triggerClassName="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-emerald-700 hover:bg-accent cursor-pointer"
                        title="¿Reactivar tarea?"
                        description={<>La tarea <strong>{row.tareaNombre}</strong> del elemento <strong>{row.elementoTag}</strong> volverá al estado PENDIENTE.</>}
                        confirmText="Reactivar"
                        pendingText="Reactivando..."
                        onConfirm={async () => {
                          await reactivarMut.mutateAsync(row.id)
                          removerDeSeleccion(row.id)
                        }}
                      />
                    )}
                    {puedeCancelar && (
                      <Button
                        size="sm" variant="outline" className="h-8 gap-1 text-xs text-amber-700"
                        onClick={() => { setCancelarTarget(row); setMotivoCancelar("") }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    )}
                    {puedeEliminar && (
                      <ConfirmActionDialog
                        trigger={<><Trash2 className="h-3.5 w-3.5" /> Eliminar</>}
                        triggerClassName="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-destructive hover:bg-accent cursor-pointer"
                        title="¿Eliminar tarea?"
                        description={<>Se eliminará la tarea <strong>{row.tareaNombre}</strong> del elemento <strong>{row.elementoTag}</strong>. Solo se permite eliminar tareas PENDIENTE o CANCELADO.</>}
                        confirmText="Eliminar"
                        pendingText="Eliminando..."
                        variant="destructive"
                        onConfirm={async () => {
                          await eliminarMut.mutateAsync(row.id)
                          removerDeSeleccion(row.id)
                        }}
                      />
                    )}
                  </div>
                )}
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
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={selectAllMatching || pageAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !selectAllMatching && pageSomeSelected && !pageAllSelected
                  }}
                  onChange={togglePageAll}
                  aria-label="Seleccionar página"
                  className="h-4 w-4 rounded border-input"
                />
              </TableHead>
              <TableHead>Elemento (TAG)</TableHead>
              <TableHead>Tarea</TableHead>
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
                const rowSelected = selectAllMatching || selectedIds.has(row.id)
                return (
                  <TableRow key={row.id} className={rowSelected ? "bg-blue-50/50" : "hover:bg-gray-50"}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={rowSelected}
                        onChange={() => toggleRow(row.id)}
                        aria-label="Seleccionar fila"
                        className="h-4 w-4 rounded border-input"
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{row.elementoTag ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{row.tareaNombre ?? "—"}</div>
                      {row.nivelNombre && (
                        <div className="text-[11px] text-muted-foreground truncate">{row.nivelNombre}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <EstadoBadge estado={row.estado} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {/* Ancho fijo + whitespace-normal para evitar que el TableCell
                          (con whitespace-nowrap default) se ensanche con el contenido
                          largo del popup del Combobox y termine mostrando las opciones
                          en fila en vez de columna. */}
                      <div className="w-48 max-w-full whitespace-normal">
                        <Combobox
                          options={usuarioSelectOptions}
                          value={row.asignadoA ?? SIN_ASIGNAR}
                          onChange={(v) => {
                            const nuevo = v === SIN_ASIGNAR ? null : v
                            asignarMut.mutate({ id: row.id, asignadoA: nuevo })
                          }}
                          placeholder="Sin asignar"
                          searchPlaceholder="Buscar usuario..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        type="date"
                        // El backend acepta ISO YYYY-MM-DD y devuelve datetime; recortamos
                        // los primeros 10 chars para el value del input.
                        value={row.fechaPlanificada ? row.fechaPlanificada.substring(0, 10) : ""}
                        onChange={(e) => {
                          const nueva = e.target.value
                          // Vaciar el input limpia la fecha (ver fila de la vista mobile).
                          if (!nueva) {
                            if (!row.fechaPlanificada) return
                            fechaMut.mutate({ id: row.id, fecha: null })
                            return
                          }
                          if (nueva === row.fechaPlanificada?.substring(0, 10)) return
                          fechaMut.mutate({ id: row.id, fecha: nueva })
                        }}
                        className="h-8 w-36 text-xs"
                      />
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
                            onConfirm={async () => {
                              await reactivarMut.mutateAsync(row.id)
                              removerDeSeleccion(row.id)
                            }}
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
                            onConfirm={async () => {
                              await eliminarMut.mutateAsync(row.id)
                              removerDeSeleccion(row.id)
                            }}
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
      </div>

      {/* Total + Paginación — mismo patrón que /alcance/elementos y el resto. */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} tarea(s) en total</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {asignarMut.error && (
        <p className="text-xs text-destructive">{(asignarMut.error as Error).message}</p>
      )}
      {eliminarMut.error && (
        <p className="text-xs text-destructive">{(eliminarMut.error as Error).message}</p>
      )}
      {reactivarMut.error && (
        <p className="text-xs text-destructive">{(reactivarMut.error as Error).message}</p>
      )}
      {fechaMut.error && (
        <p className="text-xs text-destructive">{(fechaMut.error as Error).message}</p>
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
            onChange={(v) => {
              setEspecialidadId(v)
              // Cascada: al cambiar Especialidad, limpiar Tipo y Tarea para no
              // dejar filtros huérfanos que devuelvan 0 filas silenciosamente.
              setElementoTipoId(ALL)
              setTareaNombre(ALL)
              setPage(1)
            }}
            placeholder="Todas" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Tipo de elemento">
          <Combobox options={tipoOptions} value={elementoTipoId}
            onChange={(v) => {
              setElementoTipoId(v)
              // Cascada: si el Tipo cambia, la Tarea puede ya no aplicar.
              setTareaNombre(ALL)
              setPage(1)
            }}
            placeholder="Todos" searchPlaceholder="Buscar..." />
        </FilterField>
        <FilterField label="Tarea">
          <Combobox options={tareaOptions} value={tareaNombre}
            onChange={(v) => { setTareaNombre(v); setPage(1) }}
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
      </FiltersSheet>

      {/* ── Dialogs bulk ── */}

      {/* Asignar responsable bulk */}
      <AlertDialog open={bulkAsignarOpen} onOpenChange={setBulkAsignarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Asignar responsable a {selectionCount} tarea(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Se pisa el responsable actual. Elegí un usuario o &quot;Sin asignar&quot; para desasignar.
              {selectAllMatching && <> Aplica a todas las tareas que matchean el filtro actual.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Responsable</label>
            <Combobox
              options={usuarioSelectOptions}
              value={bulkAsignarUser}
              onChange={setBulkAsignarUser}
              placeholder="Elegí usuario"
              searchPlaceholder="Buscar..."
            />
            {bulkAsignarMut.error && (
              <p className="text-xs text-destructive">{(bulkAsignarMut.error as Error).message}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkAsignarMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkAsignarMut.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarBulkAsignar() }}
            >
              {bulkAsignarMut.isPending ? "Asignando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancelar bulk (motivo obligatorio) */}
      <AlertDialog open={bulkCancelarOpen} onOpenChange={setBulkCancelarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar {selectionCount} tarea(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcarán como <strong>CANCELADO</strong>. Las tareas que ya estén COMPLETADAS / FIRMADAS
              no pueden ser canceladas (verás el detalle en el resumen).
              {selectAllMatching && <> Aplica a todas las tareas que matchean el filtro actual.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo *</label>
            <Textarea
              value={bulkCancelarMotivo}
              onChange={(e) => setBulkCancelarMotivo(e.target.value)}
              placeholder="Motivo común para toda la selección..."
              rows={3}
            />
            {bulkCancelarMut.error && (
              <p className="text-xs text-destructive">{(bulkCancelarMut.error as Error).message}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkCancelarMut.isPending}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!bulkCancelarMotivo.trim() || bulkCancelarMut.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarBulkCancelar() }}
            >
              {bulkCancelarMut.isPending ? "Cancelando..." : "Confirmar cancelación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cambiar fecha planificada bulk */}
      <AlertDialog open={bulkFechaOpen} onOpenChange={setBulkFechaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar fecha planificada a {selectionCount} tarea(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Se pisa la fecha planificada de todas las seleccionadas y se marca origen{" "}
              <strong>Manual</strong> (el generador no la vuelve a mover).
              {selectAllMatching && <> Aplica a todas las tareas que matchean el filtro actual.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nueva fecha *</label>
            <Input
              type="date"
              value={bulkFecha}
              onChange={(e) => setBulkFecha(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Si te equivocaste al cargar, <strong>Quitar fecha</strong> las deja sin fecha
              planificada y vuelven a entrar en el cálculo automático.
            </p>
            {bulkFechaMut.error && (
              <p className="text-xs text-destructive">{(bulkFechaMut.error as Error).message}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkFechaMut.isPending}>Cancelar</AlertDialogCancel>
            <button
              type="button"
              disabled={bulkFechaMut.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarBulkFecha(true) }}
              className="inline-flex items-center justify-center h-9 rounded-md border border-input px-3 text-sm font-medium cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quitar fecha
            </button>
            <AlertDialogAction
              disabled={!bulkFecha || bulkFechaMut.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarBulkFecha() }}
            >
              {bulkFechaMut.isPending ? "Actualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivar bulk */}
      <AlertDialog open={bulkReactivarOpen} onOpenChange={setBulkReactivarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar {selectionCount} tarea(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Sólo se reactivan las CANCELADAS cuyo Elemento y Tarea sigan activos. Las que no
              cumplan se rechazan (verás el detalle en el resumen). Vuelven a estado PENDIENTE.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkReactivarMut.error && (
            <p className="text-xs text-destructive">{(bulkReactivarMut.error as Error).message}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkReactivarMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkReactivarMut.isPending}
              onClick={(e) => { e.preventDefault(); ejecutarBulkReactivar() }}
            >
              {bulkReactivarMut.isPending ? "Reactivando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detalle de rechazos del último bulk */}
      <AlertDialog open={rechazosOpen} onOpenChange={setRechazosOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Rechazos de {bulkResumen?.accion.toLowerCase()} · {bulkResumen?.result.rechazadas.length}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Filas que la operación no pudo procesar. El resto se aplicó correctamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-1.5 text-left">Elemento</th>
                  <th className="px-2 py-1.5 text-left">Tarea</th>
                  <th className="px-2 py-1.5 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {bulkResumen?.result.rechazadas.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{r.elementoTag ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.tareaNombre ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
