"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search, FileSpreadsheet, FileJson, Sparkles, X } from "lucide-react"

import { useGetPlanillas } from "@/features/planillas/api/use-get-planillas"
import { useNewPlanilla } from "@/features/planillas/hooks/use-new-planilla"
import { NewPlanillaSheet } from "@/features/planillas/components/new-planilla-sheet"
import { EditPlanillaSheet } from "@/features/planillas/components/edit-planilla-sheet"
import { ImportExcelSheet } from "@/features/planillas/components/import-excel-sheet"
import { ImportJsonSheet } from "@/features/planillas/components/import-json-sheet"
import { GenerarConIASheet } from "@/features/planillas/components/generar-con-ia-sheet"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

/** Token sentinela en el CSV de EspecialidadIds para pedir planillas sin especialidad
    (genéricas). Debe matchear el string usado en `PlanillaService` del backend. */
const TOKEN_GENERICAS = "__none__"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PlanillasPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [especialidadesSel, setEspecialidadesSel] = useState<Set<string>>(new Set())

  const especialidadIdsArr = useMemo(() => Array.from(especialidadesSel), [especialidadesSel])
  const { data, isLoading, isFetching } = useGetPlanillas({
    page,
    pageSize,
    nombre: search || undefined,
    especialidadIds: especialidadIdsArr.length > 0 ? especialidadIdsArr : undefined,
  })
  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []
  const { open } = useNewPlanilla()

  const toggleEspecialidad = (id: string) => {
    setEspecialidadesSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setPage(1)
  }
  const limpiarEspecialidades = () => {
    setEspecialidadesSel(new Set())
    setPage(1)
  }
  const [importOpen, setImportOpen] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)
  const [generarIAOpen, setGenerarIAOpen] = useState(false)

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
      <NewPlanillaSheet />
      <EditPlanillaSheet />
      <ImportExcelSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <ImportJsonSheet open={importJsonOpen} onClose={() => setImportJsonOpen(false)} />
      <GenerarConIASheet open={generarIAOpen} onClose={() => setGenerarIAOpen(false)} />

      <div className="space-y-4">
        {/* Buscador + Acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => setGenerarIAOpen(true)} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Generar con IA
            </Button>
            <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Importar desde Excel
            </Button>
            <Button onClick={() => setImportJsonOpen(true)} variant="outline" className="gap-2">
              <FileJson className="h-4 w-4 text-blue-600" />
              Importar JSON
            </Button>
            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva planilla
            </Button>
          </div>
        </div>

        {/* Filtro chips por especialidad. Multi-select ESTRICTO: cada chip agrega
            su ID al filtro y sólo matchean planillas con esa especialidad. El chip
            "Genéricas" (token "__none__") pide explícitamente las planillas sin
            especialidad. Sin nada seleccionado = sin filtro (muestra todas). */}
        {especialidades.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground mr-1">Especialidad:</span>
            {especialidades.map((e) => {
              const activo = especialidadesSel.has(e.id)
              const color = e.color ?? "#6b7280"
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEspecialidad(e.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: `${color}22`, color, borderColor: color }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title={e.nombre}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {e.codigo || e.nombre}
                </button>
              )
            })}
            {/* Chip especial "Genéricas" — matchea planillas sin EspecialidadId.
                Se envía como token "__none__" en la CSV que consume el backend. */}
            {(() => {
              const activo = especialidadesSel.has(TOKEN_GENERICAS)
              return (
                <button
                  type="button"
                  onClick={() => toggleEspecialidad(TOKEN_GENERICAS)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 font-medium italic transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: "#f3f4f6", color: "#111827", borderColor: "#9ca3af" }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title="Planillas sin especialidad asignada"
                >
                  Genéricas
                </button>
              )
            })()}
            {especialidadesSel.size > 0 && (
              <button
                type="button"
                onClick={limpiarEspecialidades}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
        )}

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
                    No se encontraron planillas.
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
          <span>{data?.total ?? 0} planillas en total</span>
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
