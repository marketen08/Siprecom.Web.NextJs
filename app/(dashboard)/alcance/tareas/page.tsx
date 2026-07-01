"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search } from "lucide-react"

import { useGetTareas } from "@/features/tareas/api/use-get-tareas"
import { useNewTarea } from "@/features/tareas/hooks/use-new-tarea"
import { NewTareaSheet } from "@/features/tareas/components/new-tarea-sheet"
import { EditTareaSheet } from "@/features/tareas/components/edit-tarea-sheet"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import { PRIORIDAD, TIPO_ASIGNACION_LABEL, TIPO_ASIGNACION_TAREA } from "@/features/tareas/types"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
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

export default function TareasPage() {
  const [search, setSearch] = useState("")
  const [elementoTipoId, setElementoTipoId] = useState<string>(ALL)
  const [especialidadId, setEspecialidadId] = useState<string>(ALL)
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [planillaId, setPlanillaId] = useState<string>(ALL)
  const [prioridad, setPrioridad] = useState<string>(ALL)
  const [tipoAsignacion, setTipoAsignacion] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetTareas({
    page,
    pageSize,
    nombre: search || undefined,
    elementoTipoId: elementoTipoId !== ALL ? elementoTipoId : undefined,
    especialidadId: especialidadId !== ALL ? especialidadId : undefined,
    nivelId: nivelId !== ALL ? nivelId : undefined,
    planillaId: planillaId !== ALL ? planillaId : undefined,
    prioridad: prioridad !== ALL ? Number(prioridad) : undefined,
    tipoAsignacion: tipoAsignacion !== ALL ? Number(tipoAsignacion) : undefined,
  })
  const { open } = useNewTarea()

  const { data: tiposRaw } = useGetElementosTiposSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: planillasRaw } = useGetPlanillasSelect()
  const tipos = (tiposRaw as any)?.data ?? []
  const especialidades = (especialidadesRaw as any)?.data ?? []
  const niveles = (nivelesRaw as any)?.data ?? (Array.isArray(nivelesRaw) ? nivelesRaw : [])
  const planillas = (planillasRaw as any)?.data ?? []

  // El select de Tipo de elemento se acota a la especialidad elegida (cada tipo
  // pertenece a una especialidad). Sin especialidad seleccionada, muestra todos.
  const tiposFiltrados =
    especialidadId !== ALL
      ? tipos.filter((t: any) => t.especialidadId === especialidadId)
      : tipos

  // Al cambiar la especialidad, si el tipo elegido ya no pertenece a ella, lo limpiamos.
  // El Select de Base UI pasa `string | null` — toleramos ambos y normalizamos a ALL.
  function handleEspecialidadChange(v: string | null) {
    const next = v ?? ALL
    setEspecialidadId(next)
    if (next !== ALL && elementoTipoId !== ALL) {
      const t = tipos.find((x: any) => x.id === elementoTipoId)
      if (!t || t.especialidadId !== next) setElementoTipoId(ALL)
    }
    setPage(1)
  }

  function clearFiltros() {
    setElementoTipoId(ALL)
    setEspecialidadId(ALL)
    setNivelId(ALL)
    setPlanillaId(ALL)
    setPrioridad(ALL)
    setTipoAsignacion(ALL)
    setPage(1)
  }

  // Chips de filtros activos
  const activeFilters: FilterChip[] = []
  if (elementoTipoId !== ALL) {
    const t = tipos.find((x: any) => x.id === elementoTipoId)
    activeFilters.push({
      id: "tipo",
      label: `Tipo: ${t?.nombre ?? "—"}`,
      onRemove: () => { setElementoTipoId(ALL); setPage(1) },
    })
  }
  if (especialidadId !== ALL) {
    const e = especialidades.find((x: any) => x.id === especialidadId)
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${e?.nombre ?? "—"}`,
      onRemove: () => { setEspecialidadId(ALL); setPage(1) },
    })
  }
  if (nivelId !== ALL) {
    const n = niveles.find((x: any) => x.id === nivelId)
    activeFilters.push({
      id: "nivel",
      label: `Nivel: ${n?.nombre ?? "—"}`,
      onRemove: () => { setNivelId(ALL); setPage(1) },
    })
  }
  if (planillaId !== ALL) {
    const p = planillas.find((x: any) => x.id === planillaId)
    activeFilters.push({
      id: "planilla",
      label: `Planilla: ${p?.nombre ?? "—"}`,
      onRemove: () => { setPlanillaId(ALL); setPage(1) },
    })
  }
  if (prioridad !== ALL) {
    activeFilters.push({
      id: "prioridad",
      label: `Prioridad: ${PRIORIDAD[Number(prioridad) as keyof typeof PRIORIDAD] ?? "—"}`,
      onRemove: () => { setPrioridad(ALL); setPage(1) },
    })
  }
  if (tipoAsignacion !== ALL) {
    activeFilters.push({
      id: "tipoAsignacion",
      label: `Se instancia por: ${TIPO_ASIGNACION_LABEL[Number(tipoAsignacion)] ?? "—"}`,
      onRemove: () => { setTipoAsignacion(ALL); setPage(1) },
    })
  }

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount: data?.total ?? 0,
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  return (
    <>
      <NewTareaSheet />
      <EditTareaSheet />

      <div className="space-y-4">
        {/* Buscador + Nuevo + Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Button>
            <FiltersTrigger
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeCount={activeFilters.length}
            />
          </div>
        </div>

        {/* Chips de filtros activos */}
        <FiltersChips activeFilters={activeFilters} onClearAll={clearFiltros} />

        {/* Sheet con los controles */}
        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClearAll={clearFiltros}
          hasActiveFilters={activeFilters.length > 0}
        >
          <FilterField label="Especialidad">
            <Select
              value={especialidadId}
              onValueChange={handleEspecialidadChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {especialidadId === ALL
                    ? "Todas las especialidades"
                    : especialidades.find((e: any) => e.id === especialidadId)?.nombre ?? "Especialidad"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las especialidades</SelectItem>
                {especialidades.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Tipo de elemento">
            <Combobox
              options={[
                { value: ALL, label: "Todos los tipos" },
                ...tiposFiltrados.map((t: any) => ({ value: t.id, label: t.nombre })),
              ]}
              value={elementoTipoId}
              onChange={(v) => { setElementoTipoId(v); setPage(1) }}
              placeholder="Todos los tipos"
              searchPlaceholder="Buscar tipo..."
              emptyMessage="Sin tipos"
            />
          </FilterField>

          <FilterField label="Nivel">
            <Select
              value={nivelId}
              onValueChange={(v) => { setNivelId(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {nivelId === ALL
                    ? "Todos los niveles"
                    : niveles.find((n: any) => n.id === nivelId)?.nombre ?? "Nivel"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los niveles</SelectItem>
                {niveles.map((n: any) => (
                  <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Planilla">
            <Combobox
              options={[
                { value: ALL, label: "Todas las planillas" },
                ...planillas.map((p: any) => ({ value: p.id, label: p.nombre })),
              ]}
              value={planillaId}
              onChange={(v) => { setPlanillaId(v); setPage(1) }}
              placeholder="Todas las planillas"
              searchPlaceholder="Buscar planilla..."
              emptyMessage="Sin planillas"
            />
          </FilterField>

          <FilterField label="Prioridad">
            <Select
              value={prioridad}
              onValueChange={(v) => { setPrioridad(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {prioridad === ALL ? "Todas las prioridades" : PRIORIDAD[Number(prioridad) as keyof typeof PRIORIDAD] ?? "Prioridad"}
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

          <FilterField label="Se instancia por">
            <Select
              value={tipoAsignacion}
              onValueChange={(v) => { setTipoAsignacion(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tipoAsignacion === ALL
                    ? "Todos los modos"
                    : TIPO_ASIGNACION_LABEL[Number(tipoAsignacion)] ?? "Modo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los modos</SelectItem>
                <SelectItem value={String(TIPO_ASIGNACION_TAREA.ELEMENTO_INDIVIDUAL)}>
                  Por elemento
                </SelectItem>
                <SelectItem value={String(TIPO_ASIGNACION_TAREA.TEST_GROUP_PRESSURE)}>
                  Por Pressure Test Pack
                </SelectItem>
                <SelectItem value={String(TIPO_ASIGNACION_TAREA.TEST_GROUP_BASIC_FUNCTION)}>
                  Por Basic Function
                </SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FiltersSheet>

        {/* Tabla */}
        <DataTableWrapper isFetching={isFetching && !isLoading}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold text-gray-700">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                    No se encontraron tareas.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>

        {/* Total + Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total ?? 0} tareas en total</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
