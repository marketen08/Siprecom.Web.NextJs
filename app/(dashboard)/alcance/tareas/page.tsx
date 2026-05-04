"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search, X } from "lucide-react"

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

  const hayFiltros =
    search !== "" || elementoTipoId !== ALL || nivelId !== ALL || planillaId !== ALL || prioridad !== ALL

  function clearFiltros() {
    setSearch("")
    setElementoTipoId(ALL)
    setNivelId(ALL)
    setPlanillaId(ALL)
    setPrioridad(ALL)
    setPage(1)
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.total ?? 0} tareas en total
            </p>
          </div>
          <Button onClick={open} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          <Select
            value={elementoTipoId}
            onValueChange={(v) => { setElementoTipoId(v); setPage(1) }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Tipo de elemento">
                {elementoTipoId === ALL
                  ? "Todos los tipos"
                  : tipos.find((t: any) => t.id === elementoTipoId)?.nombre ?? "Tipo de elemento"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {tipos.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={nivelId}
            onValueChange={(v) => { setNivelId(v); setPage(1) }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Nivel">
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

          <Select
            value={planillaId}
            onValueChange={(v) => { setPlanillaId(v); setPage(1) }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Planilla">
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

          <Select
            value={prioridad}
            onValueChange={(v) => { setPrioridad(v); setPage(1) }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridad">
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

          {hayFiltros && (
            <Button variant="ghost" size="sm" className="text-gray-500 gap-1" onClick={clearFiltros}>
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Tabla */}
        <DataTableWrapper isFetching={isFetching && !isLoading}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="bg-gray-50">
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {totalPages}
            </span>
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
    </>
  )
}
