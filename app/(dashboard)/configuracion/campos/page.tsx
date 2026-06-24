"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search } from "lucide-react"

import { useGetCampos } from "@/features/campos/api/use-get-campos"
import { useNewCampo } from "@/features/campos/hooks/use-new-campo"
import { NewCampoSheet } from "@/features/campos/components/new-campo-sheet"
import { EditCampoSheet } from "@/features/campos/components/edit-campo-sheet"
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
import { CAMPO_TIPO_DATO, type CampoTipoDato } from "@/features/planillas/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CamposPage() {
  const [search, setSearch] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<string>("__all__")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetCampos({
    page,
    pageSize,
    nombre: search || undefined,
    tipoDato: tipoFiltro === "__all__" ? undefined : Number(tipoFiltro),
  })
  const { open } = useNewCampo()

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
      <NewCampoSheet />
      <EditCampoSheet />

      <div className="space-y-4">
        {/* Buscador + Nuevo */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por etiqueta o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select
            value={tipoFiltro}
            onValueChange={(v) => { setTipoFiltro(v ?? "__all__"); setPage(1) }}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {tipoFiltro === "__all__"
                  ? "Todos los tipos"
                  : CAMPO_TIPO_DATO[Number(tipoFiltro) as CampoTipoDato]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tipos</SelectItem>
              {Object.entries(CAMPO_TIPO_DATO).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={open} className="gap-2 ml-auto">
            <Plus className="h-4 w-4" />
            Nuevo campo
          </Button>
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
                    No se encontraron campos.
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
          <span>{data?.total ?? 0} campos en total</span>
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
