"use client"

import { useMemo, useState } from "react"
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
import { useGetMisEquipos } from "@/features/equipos/api/use-equipos"
import {
  FUNCIONALIDAD,
  useFuncionalidadPlataforma,
} from "@/features/funcionalidades/api/use-funcionalidades-plataforma"
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
  const [sinteticoFilter, setSinteticoFilter] = useState<string>(ALL)
  const [agruparFilter, setAgruparFilter] = useState<string>(ALL)
  // Filtro por equipo dueno. Vacio = lo que el backend decide por defecto: el equipo activo
  // del usuario mas los globales, o todo para AdminGlobal.
  const [equipoFiltro, setEquipoFiltro] = useState<string>("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const toBool = (v: string): boolean | undefined =>
    v === ALL ? undefined : v === "true"

  const { data, isLoading, isFetching } = useGetElementosTipos({
    page,
    pageSize,
    nombre: search || undefined,
    especialidadId: especialidadId !== ALL ? especialidadId : undefined,
    esSintetico: toBool(sinteticoFilter),
    permiteAgrupar: toBool(agruparFilter),
    equipoId: equipoFiltro || undefined,
  })

  // La estructura de equipos es apagable por el SuperAdmin. Apagada, el catalogo es uno
  // solo: desaparecen el filtro Y la columna juntos, porque mostrar una sin la otra deja a
  // la vista una division que ya no divide nada.
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)
  const { data: misEquipos } = useGetMisEquipos(hayEquipos)
  const columnasVisibles = useMemo(
    () => columns.filter((c) => c.id !== "equipo" || hayEquipos),
    [hayEquipos],
  )
  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []
  const { open } = useNewElementoTipo()

  const table = useReactTable({
    data: data?.data ?? [],
    columns: columnasVisibles,
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

          <Select
            value={sinteticoFilter}
            onValueChange={(v) => { setSinteticoFilter(v ?? ALL); setPage(1) }}
          >
            <SelectTrigger className="w-44">
              <SelectValue>
                {sinteticoFilter === ALL
                  ? "Sintético: todos"
                  : sinteticoFilter === "true" ? "Sintético: sí" : "Sintético: no"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Sintético: todos</SelectItem>
              <SelectItem value="true">Sintético: sí</SelectItem>
              <SelectItem value="false">Sintético: no</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={agruparFilter}
            onValueChange={(v) => { setAgruparFilter(v ?? ALL); setPage(1) }}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {agruparFilter === ALL
                  ? "Agrupar: todos"
                  : agruparFilter === "true" ? "Agrupar: sí" : "Agrupar: no"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Agrupar: todos</SelectItem>
              <SelectItem value="true">Agrupar: sí</SelectItem>
              <SelectItem value="false">Agrupar: no</SelectItem>
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

        {/* Filtro por equipo dueño. Sólo aparece cuando hay más de una opción: para el Admin
            de un equipo único no hay nada que elegir —ve el suyo y los globales— y el chip
            sería ruido. Mismo control que en planillas y campos. */}
        {hayEquipos && misEquipos
          && (misEquipos.equipos.length > 1 || misEquipos.puedeElegirGlobales) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-muted-foreground">Equipo:</span>
            {[
              { id: "", nombre: "Todos" },
              ...misEquipos.equipos,
              { id: "__none__", nombre: "Globales" },
            ].map((opcion) => {
              const activo = equipoFiltro === opcion.id
              return (
                <button
                  key={opcion.id || "todos"}
                  type="button"
                  onClick={() => { setEquipoFiltro(opcion.id); setPage(1) }}
                  aria-pressed={activo}
                  className={
                    "inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 font-medium transition-colors "
                    + (activo
                      ? "border-blue-500 bg-blue-100 text-blue-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                  }
                >
                  {opcion.nombre}
                </button>
              )
            })}
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
                  <TableCell colSpan={columnasVisibles.length} className="text-center py-10 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnasVisibles.length} className="text-center py-10 text-muted-foreground">
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
