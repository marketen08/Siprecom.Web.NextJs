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
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetPlanillasSelect } from "@/features/planillas/api/use-get-planillas-select"
import { PRIORIDAD } from "@/features/tareas/types"
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
  const [nivelId, setNivelId] = useState<string>(ALL)
  const [planillaId, setPlanillaId] = useState<string>(ALL)
  const [prioridad, setPrioridad] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetTareas({
    page,
    pageSize,
    nombre: search || undefined,
    elementoTipoId: elementoTipoId !== ALL ? elementoTipoId : undefined,
    nivelId: nivelId !== ALL ? nivelId : undefined,
    planillaId: planillaId !== ALL ? planillaId : undefined,
    prioridad: prioridad !== ALL ? Number(prioridad) : undefined,
  })
  const { open } = useNewTarea()

  const { data: tiposRaw } = useGetElementosTiposSelect()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: planillasRaw } = useGetPlanillasSelect()
  const tipos = (tiposRaw as any)?.data ?? []
  const niveles = (nivelesRaw as any)?.data ?? (Array.isArray(nivelesRaw) ? nivelesRaw : [])
  const planillas = (planillasRaw as any)?.data ?? []

  function clearFiltros() {
    setElementoTipoId(ALL)
    setNivelId(ALL)
    setPlanillaId(ALL)
    setPrioridad(ALL)
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

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
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
          <FilterField label="Tipo de elemento">
            <Select
              value={elementoTipoId}
              onValueChange={(v) => { setElementoTipoId(v); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {elementoTipoId === ALL
                    ? "Todos los tipos"
                    : tipos.find((t: any) => t.id === elementoTipoId)?.nombre ?? "Tipo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {tipos.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Nivel">
            <Select
              value={nivelId}
              onValueChange={(v) => { setNivelId(v); setPage(1) }}
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
            <Select
              value={planillaId}
              onValueChange={(v) => { setPlanillaId(v); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {planillaId === ALL
                    ? "Todas las planillas"
                    : planillas.find((p: any) => p.id === planillaId)?.nombre ?? "Planilla"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las planillas</SelectItem>
                {planillas.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Prioridad">
            <Select
              value={prioridad}
              onValueChange={(v) => { setPrioridad(v); setPage(1) }}
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
