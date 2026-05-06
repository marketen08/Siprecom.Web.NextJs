"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search } from "lucide-react"

import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useNewElemento } from "@/features/elementos/hooks/use-new-elemento"
import { NewElementoSheet } from "@/features/elementos/components/new-elemento-sheet"
import { EditElementoSheet } from "@/features/elementos/components/edit-elemento-sheet"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { PRIORIDAD } from "@/features/elementos/types"
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
import { Combobox } from "@/components/ui/combobox"
import {
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

export default function ElementosPage() {
  const [search, setSearch] = useState("")
  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)
  const [especialidad, setEspecialidad] = useState<string>(ALL)
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [prioridad, setPrioridad] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 10

  const { data, isLoading, isFetching } = useGetElementos({
    page,
    pageSize,
    nombre: search || undefined,
    sistemaId: sistemaId !== ALL ? sistemaId : undefined,
    subSistemaId: subSistemaId !== ALL ? subSistemaId : undefined,
    elementoTipoId: elementoTipoId || undefined,
    especialidad: especialidad !== ALL ? especialidad : undefined,
    prioridad: prioridad !== ALL ? Number(prioridad) : undefined,
  })
  const { open } = useNewElemento()

  // Catálogos para los selects
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subsistemasRaw } = useGetSubSistemasSelect()
  const { data: tiposRaw } = useGetElementosTiposSelect()
  const sistemas = (sistemasRaw as any)?.data ?? []
  const subsistemas = (subsistemasRaw as any)?.data ?? []
  const tipos = (tiposRaw as any)?.data ?? []

  // Subsistemas filtrados por el sistema seleccionado
  const subsistemasFiltrados = useMemo(() => {
    if (sistemaId === ALL) return subsistemas
    return (subsistemas as any[]).filter((ss) => ss.sistemaId === sistemaId)
  }, [subsistemas, sistemaId])

  // Lista distinta de especialidades a partir de los tipos
  const especialidades = useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const t of tipos as Array<{ especialidad?: string }>) {
      if (t.especialidad?.trim()) set.add(t.especialidad)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tipos])

  // Tipos filtrados por especialidad → opciones del Combobox
  const tipoOptions = useMemo(() => {
    const filtrados = especialidad === ALL
      ? tipos
      : (tipos as any[]).filter((t) => t.especialidad === especialidad)
    return [
      { value: "", label: "Todos los tipos" },
      ...filtrados.map((t: any) => ({ value: t.id, label: t.nombre })),
    ]
  }, [tipos, especialidad])

  // Limpiar resetea solo los filtros (el buscador es independiente y se mantiene).
  function clearFiltros() {
    setSistemaId(ALL)
    setSubSistemaId(ALL)
    setEspecialidad(ALL)
    setElementoTipoId("")
    setPrioridad(ALL)
    setPage(1)
  }

  // Construir chips de filtros activos (para mostrar afuera del Sheet).
  const activeFilters: FilterChip[] = []
  if (sistemaId !== ALL) {
    const s = (sistemas as any[]).find((x) => x.id === sistemaId)
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${s ? `${s.codigo} — ${s.nombre}` : "—"}`,
      onRemove: () => handleSistemaChange(ALL),
    })
  }
  if (subSistemaId !== ALL) {
    const ss = (subsistemas as any[]).find((x) => x.id === subSistemaId)
    activeFilters.push({
      id: "subsistema",
      label: `Subsistema: ${ss ? `${ss.codigo} — ${ss.nombre}` : "—"}`,
      onRemove: () => { setSubSistemaId(ALL); setPage(1) },
    })
  }
  if (especialidad !== ALL) {
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${especialidad}`,
      onRemove: () => handleEspecialidadChange(ALL),
    })
  }
  if (elementoTipoId) {
    const t = (tipos as any[]).find((x) => x.id === elementoTipoId)
    activeFilters.push({
      id: "tipo",
      label: `Tipo: ${t?.nombre ?? "—"}`,
      onRemove: () => { setElementoTipoId(""); setPage(1) },
    })
  }
  if (prioridad !== ALL) {
    activeFilters.push({
      id: "prioridad",
      label: `Prioridad: ${PRIORIDAD[Number(prioridad) as keyof typeof PRIORIDAD] ?? "—"}`,
      onRemove: () => { setPrioridad(ALL); setPage(1) },
    })
  }

  // Si cambia el sistema y el subsistema actual no le pertenece, lo reseteamos.
  function handleSistemaChange(v: string) {
    setSistemaId(v)
    if (v !== ALL && subSistemaId !== ALL) {
      const ss = (subsistemas as any[]).find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== v) setSubSistemaId(ALL)
    }
    setPage(1)
  }

  // Si cambia la especialidad y el tipo actual no pertenece, lo reseteamos.
  function handleEspecialidadChange(v: string) {
    setEspecialidad(v)
    if (v !== ALL && elementoTipoId) {
      const tipo = (tipos as any[]).find((t) => t.id === elementoTipoId)
      if (tipo?.especialidad !== v) setElementoTipoId("")
    }
    setPage(1)
  }

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
      <NewElementoSheet />
      <EditElementoSheet />

      <div className="space-y-4">
        {/* Buscador + Nuevo elemento + Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, TAG, PID o Testpack..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo elemento
            </Button>
            <FiltersTrigger
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeCount={activeFilters.length}
            />
          </div>
        </div>

        {/* Chips de filtros activos (línea propia, solo si hay alguno) */}
        <FiltersChips activeFilters={activeFilters} onClearAll={clearFiltros} />

        {/* Sheet con los controles */}
        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClearAll={clearFiltros}
          hasActiveFilters={activeFilters.length > 0}
        >
          <FilterField label="Sistema">
            <Select value={sistemaId} onValueChange={handleSistemaChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sistemaId === ALL
                    ? "Todos los sistemas"
                    : sistemas.find((s: any) => s.id === sistemaId)?.nombre ?? "Sistema"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los sistemas</SelectItem>
                {sistemas.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Subsistema">
            <Select
              value={subSistemaId}
              onValueChange={(v) => { setSubSistemaId(v); setPage(1) }}
              disabled={sistemaId !== ALL && subsistemasFiltrados.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {subSistemaId === ALL
                    ? "Todos los subsistemas"
                    : subsistemas.find((ss: any) => ss.id === subSistemaId)?.nombre ?? "Subsistema"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
                {subsistemasFiltrados.map((ss: any) => (
                  <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Especialidad">
            <Select value={especialidad} onValueChange={handleEspecialidadChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {especialidad === ALL ? "Todas las especialidades" : especialidad}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las especialidades</SelectItem>
                {especialidades.map((esp) => (
                  <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Tipo de elemento">
            <Combobox
              options={tipoOptions}
              value={elementoTipoId}
              onChange={(v) => { setElementoTipoId(v); setPage(1) }}
              placeholder="Todos los tipos"
              searchPlaceholder="Buscar tipo..."
              emptyMessage="Sin resultados"
            />
          </FilterField>

          <FilterField label="Prioridad">
            <Select
              value={prioridad}
              onValueChange={(v) => { setPrioridad(v); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
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
          </FilterField>
        </FiltersSheet>

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
                    No se encontraron elementos.
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
          <span>{data?.total ?? 0} elementos en total</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span>Página {page} de {totalPages}</span>
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
      </div>
    </>
  )
}
