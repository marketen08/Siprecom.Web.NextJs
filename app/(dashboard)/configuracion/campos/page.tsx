"use client"

import { useMemo, useState } from "react"
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
import { useGetPlanillas } from "@/features/planillas/api/use-get-planillas"
import { useGetMisEquipos } from "@/features/equipos/api/use-equipos"
import {
  FUNCIONALIDAD,
  useFuncionalidadPlataforma,
} from "@/features/funcionalidades/api/use-funcionalidades-plataforma"
import { columns } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CAMPO_TIPO_DATO, CAMPO_TIPO_DATO_ENTRIES_SORTED, type CampoTipoDato } from "@/features/planillas/types"

/** Value sentinela para el Combobox — Base UI Select no acepta "" como value. */
const PLANILLA_TODAS = "__all__"
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
  const [planillaFiltro, setPlanillaFiltro] = useState<string>(PLANILLA_TODAS)
  // Filtro por equipo dueño. Vacío = lo que el backend decide por defecto: el equipo
  // activo del usuario más los globales, o todo para AdminGlobal.
  const [equipoFiltro, setEquipoFiltro] = useState<string>("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  // La estructura de equipos es apagable por el SuperAdmin. Apagada, el catálogo es uno
  // solo: desaparecen el filtro Y la columna juntos, porque mostrar una sin la otra deja a
  // la vista una división que ya no divide nada.
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)
  const { data: misEquipos } = useGetMisEquipos(hayEquipos)

  const { data, isLoading, isFetching } = useGetCampos({
    page,
    pageSize,
    nombre: search || undefined,
    tipoDato: tipoFiltro === "__all__" ? undefined : Number(tipoFiltro),
    planillaId: planillaFiltro === PLANILLA_TODAS ? undefined : planillaFiltro,
    equipoId: equipoFiltro || undefined,
  })
  const { open } = useNewCampo()

  // Cargamos todas las planillas para el Combobox (búsqueda client-side por
  // código o nombre). pageSize alto: en la práctica <500 por tenant/proyecto.
  // Si se supera, migrar a Combobox server-side con debounce.
  const { data: planillasData } = useGetPlanillas({ page: 1, pageSize: 500 })
  const planillaOptions: ComboboxOption[] = useMemo(() => {
    const all: ComboboxOption[] = [{ value: PLANILLA_TODAS, label: "Todas las planillas" }]
    for (const p of planillasData?.data ?? []) {
      all.push({
        value: p.id,
        // Formato "CODIGO - Nombre" para poder buscar por cualquiera de los dos.
        label: p.codigo ? `${p.codigo} - ${p.nombre}` : p.nombre,
      })
    }
    return all
  }, [planillasData])

  // Se filtra acá y no en columns.tsx porque la decisión sale de un hook y el array
  // exportado es estático. Mismo patrón que la lista de planillas.
  const columnasVisibles = useMemo(
    () => columns.filter((c) => c.id !== "equipo" || hayEquipos),
    [hayEquipos],
  )

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
              {CAMPO_TIPO_DATO_ENTRIES_SORTED.map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-72">
            <Combobox
              options={planillaOptions}
              value={planillaFiltro}
              onChange={(v) => { setPlanillaFiltro(v); setPage(1) }}
              placeholder="Todas las planillas"
              searchPlaceholder="Buscar por código o nombre..."
              emptyMessage="Sin planillas"
            />
          </div>
          <Button onClick={open} className="gap-2 ml-auto">
            <Plus className="h-4 w-4" />
            Nuevo campo
          </Button>
        </div>

        {/* Filtro por equipo dueño. Sólo aparece cuando hay más de una opción: para el
            Admin de un equipo único no hay nada que elegir —ve el suyo y los globales— y
            el chip sería ruido. Mismo control que en el catálogo de planillas. */}
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
