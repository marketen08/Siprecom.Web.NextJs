"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { FileSpreadsheet, Plus, Search } from "lucide-react"

import { useGetElementosTipos } from "@/features/elementostipos/api/use-get-elementostipos"
import { useNewElementoTipo } from "@/features/elementostipos/hooks/use-new-elementotipo"
import { NewElementoTipoSheet } from "@/features/elementostipos/components/new-elementotipo-sheet"
import { EditElementoTipoSheet } from "@/features/elementostipos/components/edit-elementotipo-sheet"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

export default function ElementosTiposPage() {
  const [search, setSearch] = useState("")
  const [especialidadId, setEspecialidadId] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetElementosTipos({
    page,
    pageSize,
    nombre: search || undefined,
    especialidadId: especialidadId !== ALL ? especialidadId : undefined,
  })
  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []
  const { open } = useNewElementoTipo()

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
      <NewElementoTipoSheet />
      <EditElementoTipoSheet />

      <div className="space-y-4">
        {/* Buscador + Nuevo */}
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

          <Select
            value={especialidadId}
            onValueChange={(v) => { setEspecialidadId(v ?? ALL); setPage(1) }}
          >
            <SelectTrigger className="w-64">
              <SelectValue>
                {especialidadId === ALL
                  ? "Todas las especialidades"
                  : especialidades.find((e) => e.id === especialidadId)?.nombre ?? "—"}
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

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/configuracion/catalogos">
                <FileSpreadsheet className="h-4 w-4" />
                Importar
              </Link>
            </Button>
            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo tipo
            </Button>
          </div>
        </div>

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
                    No se encontraron tipos de elemento.
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
          <span>{data?.total ?? 0} tipos en total</span>
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
