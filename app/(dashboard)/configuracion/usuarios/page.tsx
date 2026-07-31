"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Search, UserPlus, ChevronRight } from "lucide-react"

import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"
import { EditUsuarioSheet } from "@/features/usuarios/components/edit-usuario-sheet"
import { NewUsuarioSheet } from "@/features/usuarios/components/new-usuario-sheet"
import type { Usuario } from "@/features/usuarios/types"
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

type EstadoFiltro = "todos" | "activos" | "baja"

const ESTADO_LABELS: Record<EstadoFiltro, string> = {
  activos: "Activos",
  baja: "Dados de baja",
  todos: "Todos",
}

const ALL = "__all__"

// Roles globales, alineados con lib/roles.ts:
//   SuperAdmin > AdminGlobal > Admin > Supervisor > Coordinador > User > Auditor > Consultor.
const ROLES: { value: string; label: string }[] = [
  { value: "SuperAdmin", label: "SuperAdmin" },
  { value: "AdminGlobal", label: "AdminGlobal" },
  { value: "Admin", label: "Admin" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Coordinador", label: "Coordinador" },
  { value: "User", label: "User" },
  { value: "Auditor", label: "Auditor" },
  { value: "Consultor", label: "Consultor" },
]

export default function UsuariosPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos")
  const [clienteId, setClienteId] = useState<string>(ALL)
  const [rol, setRol] = useState<string>(ALL)
  const pageSize = 10

  // Empresa: clientes + contratistas (estos con badge en el label).
  const { data: empresasData } = useGetClientesSelect()
  const empresas = [
    ...(empresasData?.contratistas ?? []).map((c) => ({ id: c.id, nombre: `${c.nombre} (contratista)` })),
    ...(empresasData?.clientes ?? []).map((c) => ({ id: c.id, nombre: c.nombre })),
  ]

  // "activos" → isLocked: false, "baja" → true, "todos" → undefined
  const isLockedParam = estadoFiltro === "activos" ? false
                      : estadoFiltro === "baja"    ? true
                      : undefined

  const { data, isLoading, isFetching } = useGetUsuarios({
    page,
    pageSize,
    nombre: search || undefined,
    isLocked: isLockedParam,
    clienteId: clienteId === ALL ? undefined : clienteId,
    rol: rol === ALL ? undefined : rol,
  })

  const usuarios: Usuario[] = (data as any)?.data ?? []
  const total = (data as any)?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const table = useReactTable({
    data: usuarios,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row.id,
    manualPagination: true,
    rowCount: total,
  })

  // Chips de filtros activos. El estado por defecto ("activos") no genera chip.
  const activeFilters: FilterChip[] = []
  if (estadoFiltro !== "activos") {
    activeFilters.push({
      id: "estado",
      label: `Estado: ${ESTADO_LABELS[estadoFiltro]}`,
      onRemove: () => { setEstadoFiltro("activos"); setPage(1) },
    })
  }
  if (clienteId !== ALL) {
    activeFilters.push({
      id: "empresa",
      label: `Empresa: ${empresas.find((e) => e.id === clienteId)?.nombre ?? "—"}`,
      onRemove: () => { setClienteId(ALL); setPage(1) },
    })
  }
  if (rol !== ALL) {
    activeFilters.push({
      id: "rol",
      label: `Rol: ${ROLES.find((r) => r.value === rol)?.label ?? "—"}`,
      onRemove: () => { setRol(ALL); setPage(1) },
    })
  }

  function handleClearFiltros() {
    setEstadoFiltro("activos")
    setClienteId(ALL)
    setRol(ALL)
    setPage(1)
  }

  return (
    <>
      <EditUsuarioSheet />
      <NewUsuarioSheet open={newOpen} onClose={() => setNewOpen(false)} />

      <div className="space-y-4">
        {/* Buscador + acciones (Filtros, Nuevo) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FiltersTrigger
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeCount={activeFilters.length}
            />
            <Button onClick={() => setNewOpen(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo usuario</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Chips de filtros activos */}
        <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

        {/* Sheet con los controles */}
        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClearAll={handleClearFiltros}
          hasActiveFilters={activeFilters.length > 0}
        >
          <FilterField label="Estado">
            <Select
              value={estadoFiltro}
              onValueChange={(v) => { setEstadoFiltro((v ?? "activos") as EstadoFiltro); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{ESTADO_LABELS[estadoFiltro]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="baja">Dados de baja</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Empresa">
            <Select
              value={clienteId}
              onValueChange={(v) => { setClienteId(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {clienteId === ALL
                    ? "Todas las empresas"
                    : empresas.find((e) => e.id === clienteId)?.nombre ?? "Empresa"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Rol">
            <Select
              value={rol}
              onValueChange={(v) => { setRol(v ?? ALL); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {rol === ALL ? "Todos los roles" : ROLES.find((r) => r.value === rol)?.label ?? "Rol"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FiltersSheet>

        {/* Cards (solo mobile) */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              No se encontraron usuarios.
            </div>
          ) : (
            usuarios.map((u) => {
              const fullName = [u.nombre, u.apellido].filter(Boolean).join(" ")
              const roles = u.roles ?? []
              return (
                <Link
                  key={u.id}
                  href={`/configuracion/usuarios/${u.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-white p-3 active:bg-blue-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium truncate">{fullName || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {u.clienteNombre && (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {u.clienteNombre}
                        </span>
                      )}
                      {roles.length > 0 && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          {roles.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })
          )}
        </div>

        {/* Tabla (solo desktop) */}
        <div className="hidden md:block">
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
        </div>

        {/* Total + Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} usuarios en total</span>
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
