"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search } from "lucide-react"

import { useGetSubSistemas } from "@/features/subsistemas/api/use-get-subsistemas"
import { useNewSubSistema } from "@/features/subsistemas/hooks/use-new-subsistema"
import { NewSubSistemaSheet } from "@/features/subsistemas/components/new-subsistema-sheet"
import { EditSubSistemaSheet } from "@/features/subsistemas/components/edit-subsistema-sheet"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
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

export default function SubSistemasPage() {
  const [search, setSearch] = useState("")
  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetSubSistemas({
    page,
    pageSize,
    nombre: search || undefined,
    sistemaId: sistemaId !== ALL ? sistemaId : undefined,
  })
  const { open } = useNewSubSistema()

  const { data: sistemasRaw } = useGetSistemasSelect()
  const sistemas = (sistemasRaw as any)?.data ?? []

  function clearFiltros() {
    setSistemaId(ALL)
    setPage(1)
  }

  const activeFilters: FilterChip[] = []
  if (sistemaId !== ALL) {
    const s = (sistemas as any[]).find((x) => x.id === sistemaId)
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${s ? `${s.codigo} — ${s.nombre}` : "—"}`,
      onRemove: () => { setSistemaId(ALL); setPage(1) },
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
      <NewSubSistemaSheet />
      <EditSubSistemaSheet />

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
              Nuevo subsistema
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
          <FilterField label="Sistema">
            <Select
              value={sistemaId}
              onValueChange={(v) => { setSistemaId(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sistemaId === ALL
                    ? "Todos los sistemas"
                    : (() => {
                        const s = (sistemas as any[]).find((x) => x.id === sistemaId)
                        return s ? `${s.codigo} — ${s.nombre}` : "Sistema"
                      })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los sistemas</SelectItem>
                {(sistemas as any[]).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
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
                    No se encontraron subsistemas.
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
          <span>{data?.total ?? 0} subsistemas en total</span>
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
      </div>
    </>
  )
}
