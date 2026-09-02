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
import { useGetPlanillasGrupos } from "@/features/planillas-grupos/api/use-planillas-grupos"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

/** Token sentinela en el CSV de PlanillaGrupoIds para pedir planillas sin grupo.
    Debe matchear el string usado en `PlanillaService` del backend. */
const TOKEN_SIN_GRUPO = "__none__"

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
  const [gruposSel, setGruposSel] = useState<Set<string>>(new Set())
  // Tri-state: undefined = todas, true = solo encabezado TG, false = solo no encabezado.
  const [encabezadoFilter, setEncabezadoFilter] = useState<boolean | undefined>(undefined)

  const gruposIdsArr = useMemo(() => Array.from(gruposSel), [gruposSel])
  const { data, isLoading, isFetching } = useGetPlanillas({
    page,
    pageSize,
    nombre: search || undefined,
    planillaGrupoIds: gruposIdsArr.length > 0 ? gruposIdsArr : undefined,
    esEncabezadoTG: encabezadoFilter,
  })
  const { data: gruposRaw } = useGetPlanillasGrupos()
  const grupos = gruposRaw?.data ?? []
  const { open } = useNewPlanilla()

  const toggleGrupo = (id: string) => {
    setGruposSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setPage(1)
  }
  const limpiarGrupos = () => {
    setGruposSel(new Set())
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

        {/* Filtro chips por grupo de planillas. Multi-select ESTRICTO: cada chip
            agrega su ID al filtro. El chip "Sin grupo" (token "__none__") pide
            explícitamente las planillas comodín (sin grupo). Sin nada seleccionado
            = sin filtro (muestra todas). Reemplazó al filtro por especialidad, que
            no aportaba valor al no usarse (todas caían en "Genérica"). */}
        {grupos.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground mr-1">Grupo:</span>
            {grupos.map((g) => {
              const activo = gruposSel.has(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGrupo(g.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#3b82f6" }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title={g.descripcion ?? g.nombre}
                >
                  {g.nombre}
                </button>
              )
            })}
            {/* Chip especial "Sin grupo" — matchea planillas comodín (que no
                están en ningún grupo activo). Se envía como token "__none__". */}
            {(() => {
              const activo = gruposSel.has(TOKEN_SIN_GRUPO)
              return (
                <button
                  type="button"
                  onClick={() => toggleGrupo(TOKEN_SIN_GRUPO)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 font-medium italic transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: "#f3f4f6", color: "#111827", borderColor: "#9ca3af" }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title="Planillas sin grupo asignado (comodín — visibles en todos los proyectos)"
                >
                  Sin grupo
                </button>
              )
            })()}
            {gruposSel.size > 0 && (
              <button
                type="button"
                onClick={limpiarGrupos}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
        )}

        {/* Filtro por uso: Encabezado TG vs Estándar. Mutuamente excluyentes;
            click en el chip activo lo deselecciona (vuelve a "todas"). */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-muted-foreground mr-1">Uso:</span>
          {([
            { key: true, label: "Encabezado TG", activeColor: "#1d4ed8" },
            { key: false, label: "Estándar", activeColor: "#4b5563" },
          ] as const).map(({ key, label, activeColor }) => {
            const activo = encabezadoFilter === key
            return (
              <button
                key={String(key)}
                type="button"
                onClick={() => {
                  setEncabezadoFilter(activo ? undefined : key)
                  setPage(1)
                }}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                style={
                  activo
                    ? { backgroundColor: `${activeColor}22`, color: activeColor, borderColor: activeColor }
                    : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            )
          })}
          {encabezadoFilter !== undefined && (
            <button
              type="button"
              onClick={() => { setEncabezadoFilter(undefined); setPage(1) }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
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
