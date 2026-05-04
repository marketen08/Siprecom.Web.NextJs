"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search, X } from "lucide-react"

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

  const hayFiltros =
    search !== "" ||
    sistemaId !== ALL ||
    subSistemaId !== ALL ||
    especialidad !== ALL ||
    elementoTipoId !== "" ||
    prioridad !== ALL

  function clearFiltros() {
    setSearch("")
    setSistemaId(ALL)
    setSubSistemaId(ALL)
    setEspecialidad(ALL)
    setElementoTipoId("")
    setPrioridad(ALL)
    setPage(1)
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
    manualPagination: true,
    rowCount: data?.total ?? 0,
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  return (
    <>
      <NewElementoSheet />
      <EditElementoSheet />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Elementos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.total ?? 0} elementos en total
            </p>
          </div>
          <Button onClick={open} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo elemento
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, TAG, PID o Testpack..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          <Select value={sistemaId} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-52">
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

          <Select
            value={subSistemaId}
            onValueChange={(v) => { setSubSistemaId(v); setPage(1) }}
            disabled={sistemaId !== ALL && subsistemasFiltrados.length === 0}
          >
            <SelectTrigger className="w-52">
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

          <Select value={especialidad} onValueChange={handleEspecialidadChange}>
            <SelectTrigger className="w-44">
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

          <div className="w-56">
            <Combobox
              options={tipoOptions}
              value={elementoTipoId}
              onChange={(v) => { setElementoTipoId(v); setPage(1) }}
              placeholder="Todos los tipos"
              searchPlaceholder="Buscar tipo..."
              emptyMessage="Sin resultados"
            />
          </div>

          <Select
            value={prioridad}
            onValueChange={(v) => { setPrioridad(v); setPage(1) }}
          >
            <SelectTrigger className="w-40">
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
