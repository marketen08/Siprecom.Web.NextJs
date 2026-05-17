"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Search, UserPlus } from "lucide-react"

import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import { EditUsuarioSheet } from "@/features/usuarios/components/edit-usuario-sheet"
import { NewUsuarioSheet } from "@/features/usuarios/components/new-usuario-sheet"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

type EstadoFiltro = "todos" | "activos" | "baja"

export default function UsuariosPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos")
  const pageSize = 10

  // "activos" → isLocked: false, "baja" → true, "todos" → undefined
  const isLockedParam = estadoFiltro === "activos" ? false
                      : estadoFiltro === "baja"    ? true
                      : undefined

  const { data, isLoading, isFetching } = useGetUsuarios({
    page,
    pageSize,
    nombre: search || undefined,
    isLocked: isLockedParam,
  })

  const table = useReactTable({
    data: (data as any)?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row.id,
    manualPagination: true,
    rowCount: (data as any)?.total ?? 0,
  })

  const totalPages = Math.ceil(((data as any)?.total ?? 0) / pageSize)

  return (
    <>
      <EditUsuarioSheet />
      <NewUsuarioSheet open={newOpen} onClose={() => setNewOpen(false)} />

      <div className="space-y-4">
        {/* Buscador + Filtro estado + Nuevo */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select
            value={estadoFiltro}
            onValueChange={(v) => { setEstadoFiltro(v as EstadoFiltro); setPage(1) }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="baja">Dados de baja</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="gap-1.5 ml-auto">
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
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
                    No se encontraron usuarios.
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
          <span>{(data as any)?.total ?? 0} usuarios en total</span>
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
