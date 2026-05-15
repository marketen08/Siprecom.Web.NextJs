"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState, useEffect } from "react"
import { Search, FileDown } from "lucide-react"
import { useGetAvanceElementos } from "@/features/avance/api/use-get-avance-elementos"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetTareasSelect } from "@/features/tareas/api/use-get-tareas-select"
import { PRIORIDAD } from "@/features/elementos/types"
import { ElementoDetalleSheet } from "@/features/avance/components/elemento-detalle-sheet"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { ObtenerPlanillasDialog } from "@/features/planillas/components/obtener-planillas-dialog"
import { BarraAvance } from "@/components/barra-avance"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import type { AvanceElementoDTO } from "@/features/avance/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

/** Estados de ElementoTarea (mismos valores que el enum del backend). */
const ESTADO_TAREA_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Firmado físico",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
}

function AvanceElementosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sistemaIdParam = searchParams.get("sistemaId") ?? undefined
  const subSistemaIdParam = searchParams.get("subSistemaId") ?? undefined

  const [sistemaId, setSistemaId] = useState<string>(sistemaIdParam ?? "")
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam ?? "")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [prioridad, setPrioridad] = useState<string>("")
  const [tareaId, setTareaId] = useState<string>("")
  const [estadoTarea, setEstadoTarea] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [selectedElemento, setSelectedElemento] = useState<{ id: string; avance: AvanceElementoDTO } | null>(null)
  const [planillasDialogOpen, setPlanillasDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (subSistemaIdParam && subSistemaId !== subSistemaIdParam) {
      setSubSistemaId(subSistemaIdParam)
    }
  }, [subSistemaIdParam])

  // Cuando cambia algún filtro o la búsqueda, volvemos a la página 1.
  useEffect(() => {
    setPage(1)
  }, [search, sistemaId, subSistemaId, especialidadId, elementoTipoId, prioridad, tareaId, estadoTarea])

  useEffect(() => {
    if (sistemaIdParam && sistemaId !== sistemaIdParam) {
      setSistemaId(sistemaIdParam)
    }
  }, [sistemaIdParam])

  // Mantiene la URL sincronizada con los filtros de sistema/subsistema. Los otros filtros
  // viven solo en estado local (no van a la URL para no contaminarla).
  function syncUrl(nextSistemaId: string, nextSubSistemaId: string) {
    const qs = new URLSearchParams()
    if (nextSistemaId) qs.set("sistemaId", nextSistemaId)
    if (nextSubSistemaId) qs.set("subSistemaId", nextSubSistemaId)
    const s = qs.toString()
    router.replace(s ? `/ejecucion/elementos?${s}` : "/ejecucion/elementos")
  }

  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: tiposRaw } = useGetElementosTiposSelect()
  const { data: tareasRaw } = useGetTareasSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()

  const sistemas = sistemasRaw?.data ?? []
  const todosSubSistemas = subSistemasRaw?.data ?? []
  const tipos: Array<{ id: string; nombre: string; especialidadId?: string }> = (tiposRaw as any)?.data ?? []
  const tareas: Array<{ id: string; codigo: number; nombre: string }> = (tareasRaw as any)?.data ?? []
  const especialidades = especialidadesRaw?.data ?? []

  const subSistemasFiltrados = sistemaId
    ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId)
    : todosSubSistemas

  // Tipos filtrados por especialidad → opciones del Combobox.
  const tipoOptions = useMemo(() => {
    const filtrados = especialidadId
      ? tipos.filter((t) => t.especialidadId === especialidadId)
      : tipos
    return [
      { value: "", label: "Todos los tipos" },
      ...filtrados.map((t) => ({ value: t.id, label: t.nombre })),
    ]
  }, [tipos, especialidadId])

  // Opciones de tareas para el Combobox.
  const tareaOptions = useMemo(
    () => [
      { value: "", label: "Todas las tareas" },
      ...tareas.map((t) => ({ value: t.id, label: t.nombre })),
    ],
    [tareas],
  )

  const { data: raw, isLoading } = useGetAvanceElementos({
    sistemaId: sistemaId || undefined,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
    prioridad: prioridad ? Number(prioridad) : undefined,
    tareaId: tareaId || undefined,
    estadoTarea: estadoTarea ? Number(estadoTarea) : undefined,
    search: search.trim() || undefined,
    page,
    pageSize,
  })

  const elementos = raw?.data ?? []
  const total = raw?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    // Si el subsistema actual no pertenece al nuevo sistema, lo reseteamos.
    let nextSubSistemaId = subSistemaId
    if (id && subSistemaId) {
      const ss = todosSubSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) {
        nextSubSistemaId = ""
        setSubSistemaId("")
      }
    }
    syncUrl(id, nextSubSistemaId)
  }

  function handleSubSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSubSistemaId(id)
    syncUrl(sistemaId, id)
  }

  function handleEspecialidadChange(value: string | null) {
    const v = !value || value === ALL ? "" : value
    setEspecialidadId(v)
    // Si la especialidad cambia y el tipo actual ya no le corresponde, lo limpiamos.
    if (v && elementoTipoId) {
      const tipo = tipos.find((t) => t.id === elementoTipoId)
      if (tipo?.especialidadId !== v) setElementoTipoId("")
    }
  }

  function handleClearFiltros() {
    setSistemaId("")
    setSubSistemaId("")
    setEspecialidadId("")
    setElementoTipoId("")
    setPrioridad("")
    setTareaId("")
    setEstadoTarea("")
    setSearch("")
    syncUrl("", "")
  }

  const sistemaSeleccionado = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSeleccionado = todosSubSistemas.find((ss) => ss.id === subSistemaId)
  const tipoSeleccionado = tipos.find((t) => t.id === elementoTipoId)
  const tareaSeleccionada = tareas.find((t) => t.id === tareaId)

  // Construir chips de filtros activos (la búsqueda es independiente y NO genera chip).
  const activeFilters: FilterChip[] = []
  if (sistemaId) {
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${sistemaSeleccionado
        ? `${sistemaSeleccionado.codigo} — ${sistemaSeleccionado.nombre}`
        : "—"}`,
      onRemove: () => handleSistemaChange(ALL),
    })
  }
  if (subSistemaId) {
    activeFilters.push({
      id: "subsistema",
      label: `Subsistema: ${subSistemaSeleccionado
        ? `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}`
        : "—"}`,
      onRemove: () => handleSubSistemaChange(ALL),
    })
  }
  if (especialidadId) {
    const espSel = especialidades.find((e) => e.id === especialidadId)
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${espSel?.nombre ?? "—"}`,
      onRemove: () => handleEspecialidadChange(ALL),
    })
  }
  if (elementoTipoId) {
    activeFilters.push({
      id: "tipo",
      label: `Tipo: ${tipoSeleccionado?.nombre ?? "—"}`,
      onRemove: () => setElementoTipoId(""),
    })
  }
  if (prioridad) {
    activeFilters.push({
      id: "prioridad",
      label: `Prioridad: ${PRIORIDAD[Number(prioridad) as keyof typeof PRIORIDAD] ?? "—"}`,
      onRemove: () => setPrioridad(""),
    })
  }
  if (tareaId) {
    activeFilters.push({
      id: "tarea",
      label: `Tarea: ${tareaSeleccionada?.nombre ?? "—"}`,
      onRemove: () => setTareaId(""),
    })
  }
  if (estadoTarea) {
    activeFilters.push({
      id: "estadoTarea",
      label: `Estado tarea: ${ESTADO_TAREA_LABEL[Number(estadoTarea)] ?? "—"}`,
      onRemove: () => setEstadoTarea(""),
    })
  }

  // Breadcrumb dinámico cuando hay subsistema seleccionado.
  // Sin subsistema, breadcrumb default del menú (Ejecución → Avance por elementos).
  useBreadcrumb(
    subSistemaId && subSistemaSeleccionado
      ? [
          { label: "Ejecución" },
          { label: "Subsistemas", href: "/ejecucion/subsistemas" },
          { label: `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}` },
        ]
      : null
  )

  return (
    <div className="space-y-4">
      {/* Buscador + acciones (Obtener planillas, Filtros) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o TAG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setPlanillasDialogOpen(true)}>
            <FileDown className="h-4 w-4" />
            Obtener planillas
          </Button>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
        </div>
      </div>

      {/* Chips de filtros activos (línea propia, solo si hay alguno) */}
      <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

      {/* Sheet con los controles */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={handleClearFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Sistema">
          <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {sistemaSeleccionado
                  ? `${sistemaSeleccionado.codigo} — ${sistemaSeleccionado.nombre}`
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
                {subSistemaSeleccionado
                  ? `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}`
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
                {especialidades.find((e) => e.id === especialidadId)?.nombre ?? "Todas las especialidades"}
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

        <FilterField label="Prioridad">
          <Select
            value={prioridad || ALL}
            onValueChange={(v) => setPrioridad(!v || v === ALL ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {prioridad
                  ? PRIORIDAD[Number(prioridad) as keyof typeof PRIORIDAD] ?? "Prioridad"
                  : "Todas las prioridades"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las prioridades</SelectItem>
              {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                <SelectItem key={id} value={id}>{nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Tarea">
          <Combobox
            options={tareaOptions}
            value={tareaId}
            onChange={(v) => setTareaId(v)}
            placeholder="Todas las tareas"
            searchPlaceholder="Buscar tarea..."
            emptyMessage="Sin resultados"
          />
        </FilterField>

        <FilterField label="Estado de la tarea">
          <Select
            value={estadoTarea || ALL}
            onValueChange={(v) => setEstadoTarea(!v || v === ALL ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {estadoTarea
                  ? ESTADO_TAREA_LABEL[Number(estadoTarea)] ?? "Estado"
                  : "Todos los estados"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {Object.entries(ESTADO_TAREA_LABEL).map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FiltersSheet>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-28">TAG</TableHead>
              <TableHead className="font-semibold text-gray-700">Elemento</TableHead>
              <TableHead className="font-semibold text-gray-700 w-44">Subsistema</TableHead>
              <TableHead className="font-semibold text-gray-700 w-44">Tipo</TableHead>
              <TableHead className="font-semibold text-gray-700 w-24">Prioridad</TableHead>
              <TableHead className="font-semibold text-gray-700 w-28">PID</TableHead>
              <TableHead className="font-semibold text-gray-700 w-28">Testpack</TableHead>
              <TableHead className="font-semibold text-gray-700 w-52">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : elementos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  {search
                    ? "No hay elementos que coincidan con la búsqueda."
                    : subSistemaId
                      ? "No hay elementos en este subsistema."
                      : sistemaId
                        ? "No hay elementos en este sistema."
                        : "No hay elementos en el proyecto."}
                </TableCell>
              </TableRow>
            ) : (
              elementos.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setSelectedElemento({ id: e.id, avance: e })}
                >
                  <TableCell className="font-mono text-sm text-gray-600">{e.codigo}</TableCell>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell>
                    {e.subSistemaNombre || e.subSistemaCodigo ? (
                      <>
                        <p className="text-sm text-gray-600">{e.subSistemaNombre ?? "—"}</p>
                        {e.subSistemaCodigo && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {e.subSistemaCodigo}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.elementoTipoNombre || e.elementoTipoEspecialidad ? (
                      <>
                        <p className="text-sm text-gray-600">{e.elementoTipoNombre ?? "—"}</p>
                        {e.elementoTipoEspecialidad && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.elementoTipoEspecialidad}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PrioridadBadge prioridad={e.prioridadTexto} />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-500">{e.pid ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm text-gray-500">{e.testpack ?? "—"}</TableCell>
                  <TableCell>
                    <BarraAvance porcentaje={e.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="text-center" onClick={(ev) => ev.stopPropagation()}>
                    <EstadosPopover avance={e} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total + Paginación */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} elementos en total</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <ElementoDetalleSheet
        elementoId={selectedElemento?.id ?? null}
        avance={selectedElemento?.avance ?? null}
        open={!!selectedElemento}
        onClose={() => setSelectedElemento(null)}
      />

      <ObtenerPlanillasDialog
        open={planillasDialogOpen}
        onClose={() => setPlanillasDialogOpen(false)}
      />
    </div>
  )
}

export default function AvanceElementosPage() {
  return (
    <Suspense>
      <AvanceElementosContent />
    </Suspense>
  )
}

// ── PrioridadBadge ─────────────────────────────────────────────────────────────

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const styles: Record<string, string> = {
    Baja:    "bg-gray-100 text-gray-500",
    Media:   "bg-blue-50 text-blue-600",
    Alta:    "bg-orange-100 text-orange-700",
    Urgente: "bg-red-100 text-red-700",
  }
  const style = styles[prioridad] ?? "bg-gray-100 text-gray-500"
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
      {prioridad}
    </span>
  )
}
