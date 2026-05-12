"use client"

import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"

import { useSearchPendientes } from "@/features/pendientes/api/use-search-pendientes"
import {
  useGetPendienteCategorias, useGetPendienteEstados, useGetPendienteTipos,
} from "@/features/pendientes/api/use-catalogos"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import {
  ESTADO_COLOR, ESTADO_LABEL, PRIORIDAD, PRIORIDAD_COLOR,
} from "@/features/pendientes/types"
import { useNewPendiente } from "@/features/pendientes/hooks/use-new-pendiente"
import { useOpenPendiente } from "@/features/pendientes/hooks/use-open-pendiente"
import { NewPendienteSheet } from "@/features/pendientes/components/new-pendiente-sheet"
import { PendienteDetalleSheet } from "@/features/pendientes/components/pendiente-detalle-sheet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FiltersTrigger, FiltersChips, FiltersSheet, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

export default function PendientesPage() {
  const [search, setSearch] = useState("")
  const [sistemaId, setSistemaId] = useState("")
  const [subSistemaId, setSubSistemaId] = useState("")
  const [estadoId, setEstadoId] = useState("")
  const [responsableId, setResponsableId] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [tipoId, setTipoId] = useState("")
  const [prioridad, setPrioridad] = useState("")
  const [soloAbiertos, setSoloAbiertos] = useState(true)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 20

  const { open: openNew } = useNewPendiente()
  const { open: openDetalle } = useOpenPendiente()

  const { data: perfil } = useGetPerfil()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: estadosRaw } = useGetPendienteEstados()
  const { data: categoriasRaw } = useGetPendienteCategorias()
  const { data: tiposRaw } = useGetPendienteTipos()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)

  const sistemas = sistemasRaw?.data ?? []
  const subSistemas = subSistemasRaw?.data ?? []
  const estados = estadosRaw?.data ?? []
  const categorias = categoriasRaw?.data ?? []
  const tipos = tiposRaw?.data ?? []
  const usuarios = usuariosRaw ?? []

  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [subSistemas, sistemaId],
  )

  const { data, isLoading } = useSearchPendientes({
    page,
    pageSize,
    filter: {
      search: search || undefined,
      sistemaId: sistemaId || undefined,
      subSistemaId: subSistemaId || undefined,
      estadoId: estadoId || undefined,
      responsableId: responsableId || undefined,
      categoriaId: categoriaId || undefined,
      tipoId: tipoId || undefined,
      prioridad: prioridad ? Number(prioridad) : undefined,
      soloAbiertos: soloAbiertos || undefined,
    },
  })

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const items = data?.data ?? []

  function clearFiltros() {
    setSistemaId(""); setSubSistemaId(""); setEstadoId(""); setResponsableId("")
    setCategoriaId(""); setTipoId(""); setPrioridad(""); setSoloAbiertos(true)
    setPage(1)
  }

  function handleSistemaChange(v: string | null) {
    const id = !v || v === ALL ? "" : v
    setSistemaId(id)
    if (id && subSistemaId) {
      const ss = subSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) setSubSistemaId("")
    }
    setPage(1)
  }

  // Chips
  const activeFilters: FilterChip[] = []
  if (sistemaId) {
    const s = sistemas.find((x) => x.id === sistemaId)
    activeFilters.push({ id: "sistema", label: `Sistema: ${s?.nombre ?? "—"}`, onRemove: () => { setSistemaId(""); setSubSistemaId(""); setPage(1) } })
  }
  if (subSistemaId) {
    const ss = subSistemas.find((x) => x.id === subSistemaId)
    activeFilters.push({ id: "subsistema", label: `Subsistema: ${ss?.nombre ?? "—"}`, onRemove: () => { setSubSistemaId(""); setPage(1) } })
  }
  if (estadoId) {
    const e = estados.find((x) => x.id === estadoId)
    activeFilters.push({ id: "estado", label: `Estado: ${ESTADO_LABEL[e?.estado ?? ""] ?? e?.estado}`, onRemove: () => { setEstadoId(""); setPage(1) } })
  }
  if (responsableId) {
    const u = usuarios.find((x) => x.usuarioId === responsableId)
    activeFilters.push({ id: "responsable", label: `Responsable: ${u?.userName ?? "—"}`, onRemove: () => { setResponsableId(""); setPage(1) } })
  }
  if (categoriaId) {
    const c = categorias.find((x) => x.id === categoriaId)
    activeFilters.push({ id: "categoria", label: `Categoría: ${c?.nombre ?? "—"}`, onRemove: () => { setCategoriaId(""); setPage(1) } })
  }
  if (tipoId) {
    const t = tipos.find((x) => x.id === tipoId)
    activeFilters.push({ id: "tipo", label: `Tipo: ${t?.tipo ?? "—"}`, onRemove: () => { setTipoId(""); setPage(1) } })
  }
  if (prioridad) {
    activeFilters.push({ id: "prioridad", label: `Prioridad: ${PRIORIDAD[Number(prioridad)] ?? "—"}`, onRemove: () => { setPrioridad(""); setPage(1) } })
  }
  if (!soloAbiertos) {
    activeFilters.push({ id: "incluye-terminales", label: "Incluye cerrados/cancelados", onRemove: () => { setSoloAbiertos(true); setPage(1) } })
  }

  return (
    <>
      <NewPendienteSheet />
      <PendienteDetalleSheet />

      <div className="space-y-4">
        {/* Buscador + acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código (P-001), descripción o TAG..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => openNew()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo pendiente
            </Button>
            <FiltersTrigger
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeCount={activeFilters.length}
            />
          </div>
        </div>

        <FiltersChips activeFilters={activeFilters} onClearAll={clearFiltros} />

        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClearAll={clearFiltros}
          hasActiveFilters={activeFilters.length > 0}
        >
          <FilterField label="Estado">
            <Select value={estadoId || ALL} onValueChange={(v) => { setEstadoId(v === ALL ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {estadoId ? ESTADO_LABEL[estados.find((e) => e.id === estadoId)?.estado ?? ""] ?? "Estado" : "Todos los estados"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{ESTADO_LABEL[e.estado] ?? e.estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Responsable">
            <Select value={responsableId || ALL} onValueChange={(v) => { setResponsableId(v === ALL ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {responsableId
                    ? usuarios.find((u) => u.usuarioId === responsableId)?.userName ?? "Responsable"
                    : "Cualquiera"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Cualquiera</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.usuarioId} value={u.usuarioId}>{u.userName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Sistema">
            <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sistemaId ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "Sistema" : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Subsistema">
            <Select
              value={subSistemaId || ALL}
              onValueChange={(v) => { setSubSistemaId(v === ALL ? "" : (v ?? "")); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {subSistemaId
                    ? subSistemas.find((ss) => ss.id === subSistemaId)?.nombre ?? "Subsistema"
                    : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {subSistemasFiltrados.map((ss) => (
                  <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Categoría">
            <Select value={categoriaId || ALL} onValueChange={(v) => { setCategoriaId(v === ALL ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {categoriaId ? categorias.find((c) => c.id === categoriaId)?.nombre ?? "Categoría" : "Todas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Tipo">
            <Select value={tipoId || ALL} onValueChange={(v) => { setTipoId(v === ALL ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tipoId ? tipos.find((t) => t.id === tipoId)?.tipo ?? "Tipo" : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Prioridad">
            <Select value={prioridad || ALL} onValueChange={(v) => { setPrioridad(v === ALL ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {prioridad ? PRIORIDAD[Number(prioridad)] : "Todas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                  <SelectItem key={id} value={id}>{nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Mostrar">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soloAbiertos}
                onChange={(e) => { setSoloAbiertos(e.target.checked); setPage(1) }}
                className="h-4 w-4 rounded border-gray-300"
              />
              Solo abiertos (excluye CERRADO/CANCELADO)
            </label>
          </FilterField>
        </FiltersSheet>

        {/* Tabla */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 font-semibold text-gray-700">Código</TableHead>
                <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Subsistema</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700">Categoría</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Prioridad</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Estado</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Responsable</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Cierre est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No hay pendientes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => openDetalle(p.id)}
                  >
                    <TableCell className="font-mono text-sm text-blue-700">{p.codigoFormateado}</TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2">{p.descripcion}</p>
                      {p.elementoTag && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{p.elementoTag}</span>
                          {p.elementoNombre ? ` — ${p.elementoNombre}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.subSistemaNombre || p.subSistemaCodigo ? (
                        <>
                          <p className="text-sm text-gray-600">{p.subSistemaNombre ?? "—"}</p>
                          {p.subSistemaCodigo && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {p.subSistemaCodigo}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{p.categoriaNombre}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PRIORIDAD_COLOR[p.prioridad] ?? "bg-gray-100"}`}>
                        {PRIORIDAD[p.prioridad]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                        {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{p.responsableNombre}</TableCell>
                    <TableCell className="text-sm font-mono text-gray-500">{p.fechaCierreEstimado}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total + Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} pendientes en total</span>
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
