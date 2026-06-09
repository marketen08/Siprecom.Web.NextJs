"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Box, Plus, Search } from "lucide-react"

import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"
import { useNewProyecto } from "@/features/proyectos/hooks/use-new-proyecto"
import { NewProyectoSheet } from "@/features/proyectos/components/new-proyecto-sheet"
import { EditProyectoSheet } from "@/features/proyectos/components/edit-proyecto-sheet"
import { CrearProyectoDesdeIfcSheet } from "@/features/modelo-3d/components/crear-proyecto-desde-ifc-sheet"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"
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

export default function ProyectosPage() {
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState<string>(ALL)
  const [clienteId, setClienteId] = useState<string>(ALL)
  const [contratistaId, setContratistaId] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openCrearDesdeIfc, setOpenCrearDesdeIfc] = useState(false)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetProyectos({
    page,
    pageSize,
    nombre: search || undefined,
    estado: estado !== ALL ? Number(estado) : undefined,
    clienteId: clienteId !== ALL ? clienteId : undefined,
    contratistaId: contratistaId !== ALL ? contratistaId : undefined,
  })
  const { open } = useNewProyecto()

  // Catálogo de clientes y contratistas (un solo fetch que devuelve ambos separados)
  const { data: clientesData } = useGetClientesSelect()
  const clientes = clientesData?.clientes ?? []
  const contratistas = clientesData?.contratistas ?? []

  // Limpiar resetea filtros (no toca el buscador, igual que en /alcance/elementos)
  function clearFiltros() {
    setEstado(ALL)
    setClienteId(ALL)
    setContratistaId(ALL)
    setPage(1)
  }

  // Chips de filtros activos
  const activeFilters: FilterChip[] = []
  if (estado !== ALL) {
    const num = Number(estado) as keyof typeof ESTADO_PROYECTO
    activeFilters.push({
      id: "estado",
      label: `Estado: ${ESTADO_PROYECTO[num] ?? "—"}`,
      onRemove: () => { setEstado(ALL); setPage(1) },
    })
  }
  if (clienteId !== ALL) {
    const c = clientes.find((x) => x.id === clienteId)
    activeFilters.push({
      id: "cliente",
      label: `Cliente: ${c?.nombre ?? "—"}`,
      onRemove: () => { setClienteId(ALL); setPage(1) },
    })
  }
  if (contratistaId !== ALL) {
    const c = contratistas.find((x) => x.id === contratistaId)
    activeFilters.push({
      id: "contratista",
      label: `Contratista: ${c?.nombre ?? "—"}`,
      onRemove: () => { setContratistaId(ALL); setPage(1) },
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
      <NewProyectoSheet />
      <EditProyectoSheet />
      <CrearProyectoDesdeIfcSheet
        open={openCrearDesdeIfc}
        onClose={() => setOpenCrearDesdeIfc(false)}
      />

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
            <Button onClick={() => setOpenCrearDesdeIfc(true)} variant="outline" className="gap-2">
              <Box className="h-4 w-4" />
              Crear desde IFC o NWD
            </Button>
            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo proyecto
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
          <FilterField label="Estado">
            <Select
              value={estado}
              onValueChange={(v) => { setEstado(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {estado === ALL
                    ? "Todos los estados"
                    : ESTADO_PROYECTO[Number(estado) as keyof typeof ESTADO_PROYECTO] ?? "Estado"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {Object.entries(ESTADO_PROYECTO).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Cliente">
            <Select
              value={clienteId}
              onValueChange={(v) => { setClienteId(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {clienteId === ALL
                    ? "Todos los clientes"
                    : clientes.find((c) => c.id === clienteId)?.nombre ?? "Cliente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Contratista">
            <Select
              value={contratistaId}
              onValueChange={(v) => { setContratistaId(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {contratistaId === ALL
                    ? "Todos los contratistas"
                    : contratistas.find((c) => c.id === contratistaId)?.nombre ?? "Contratista"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los contratistas</SelectItem>
                {contratistas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
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
                    No se encontraron proyectos.
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
          <span>{data?.total ?? 0} proyectos en total</span>
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
