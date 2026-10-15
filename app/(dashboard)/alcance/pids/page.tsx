"use client"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus } from "lucide-react"

import { useGetPids } from "@/features/pids/api/use-get-pids"
import { useNewPid } from "@/features/pids/hooks/use-new-pid"
import { NewPidSheet } from "@/features/pids/components/new-pid-sheet"
import { EditPidSheet } from "@/features/pids/components/edit-pid-sheet"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PidsPage() {
  const { data, isLoading, isFetching } = useGetPids()
  const { open } = useNewPid()

  const rows = data?.data ?? []
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <>
      <NewPidSheet />
      <EditPidSheet />

      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">PIDs</h1>
            <p className="text-sm text-muted-foreground">
              Planos P&amp;ID del proyecto. Se pueden visualizar en tablet y registrar
              pendientes desde el propio plano.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={open} className="gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              Nuevo PID
            </Button>
          </div>
        </div>

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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                    Todavía no hay PIDs cargados. Subí el primero con el botón &ldquo;Nuevo PID&rdquo;.
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

        <div className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "PID" : "PIDs"} en total
        </div>
      </div>
    </>
  )
}
