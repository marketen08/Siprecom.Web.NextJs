"use client"

import { useState } from "react"
import {
  useReactTable, getCoreRowModel, flexRender,
} from "@tanstack/react-table"
import { ArrowRightLeft, Plus, Search } from "lucide-react"
import Link from "next/link"

import { useGetTestGroups } from "@/features/testgroups/api/use-get-testgroups"
import { useNewTestGroup } from "@/features/testgroups/hooks/use-new-testgroup"
import { NewTestGroupSheet } from "@/features/testgroups/components/new-testgroup-sheet"
import { EditTestGroupSheet } from "@/features/testgroups/components/edit-testgroup-sheet"
import { TIPO_TEST_GROUP, type TipoTestGroup } from "@/features/testgroups/types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TIPO_ALL = "__all__"
const SUBSISTEMA_ALL = "__all__"

export default function TestGroupsPage() {
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState<string>(TIPO_ALL)
  const [subSistemaFilter, setSubSistemaFilter] = useState<string>(SUBSISTEMA_ALL)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const tipoParam: TipoTestGroup | undefined =
    tipoFilter === TIPO_ALL ? undefined : (parseInt(tipoFilter, 10) as TipoTestGroup)
  const subSistemaParam: string | undefined =
    subSistemaFilter === SUBSISTEMA_ALL ? undefined : subSistemaFilter

  const { data, isLoading, isFetching } = useGetTestGroups({
    page, pageSize,
    nombre: search || undefined,
    tipo: tipoParam,
    subSistemaId: subSistemaParam,
  })
  const { open } = useNewTestGroup()

  // Catálogo de subsistemas para el select. Los subsistemas del proyecto activo
  // se resuelven en el backend a partir del claim del user — sólo hace falta pedirlos.
  const { data: subsistemasRaw } = useGetSubSistemasSelect()
  const subsistemas = subsistemasRaw?.data ?? []
  const subSistemaNombre = subSistemaFilter === SUBSISTEMA_ALL
    ? "Todos los subsistemas"
    : (() => {
        const s = subsistemas.find((x) => x.id === subSistemaFilter)
        return s ? `${s.codigo} · ${s.nombre}` : "Subsistema"
      })()

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
      <NewTestGroupSheet />
      <EditTestGroupSheet />

      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v ?? TIPO_ALL); setPage(1) }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos los tipos">
                {tipoFilter === TIPO_ALL
                  ? "Todos los tipos"
                  : tipoFilter === String(TIPO_TEST_GROUP.PRESSURE)
                    ? "Pressure Test Pack"
                    : "Basic Function"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_ALL}>Todos los tipos</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.PRESSURE)}>Pressure Test Pack</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.BASIC_FUNCTION)}>Basic Function</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={subSistemaFilter}
            onValueChange={(v) => { setSubSistemaFilter(v ?? SUBSISTEMA_ALL); setPage(1) }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos los subsistemas">{subSistemaNombre}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SUBSISTEMA_ALL}>Todos los subsistemas</SelectItem>
              {subsistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.codigo} · {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/alcance/test-groups/asignacion">
                <ArrowRightLeft className="h-4 w-4" />
                Asignar elementos
              </Link>
            </Button>
            <Button variant="outline" onClick={() => open(TIPO_TEST_GROUP.BASIC_FUNCTION)} className="gap-2">
              <Plus className="h-4 w-4" />
              Basic Function
            </Button>
            <Button onClick={() => open(TIPO_TEST_GROUP.PRESSURE)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pressure Test Pack
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
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                    No hay paquetes de prueba definidos.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total ?? 0} paquete(s) en total</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Siguiente</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
