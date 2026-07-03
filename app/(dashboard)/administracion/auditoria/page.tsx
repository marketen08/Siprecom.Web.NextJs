"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileSpreadsheet, History, Loader2 } from "lucide-react"

import { descargarAuditoriaExcel, useAuditoria } from "@/features/auditoria/api/use-auditoria"
import {
  ACCION_BADGE, ACCIONES, ENTIDAD_GRUPOS, labelCampo, labelEntidad,
  type AuditoriaFiltros,
} from "@/features/auditoria/types"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import { useAuthStore } from "@/store/auth-store"
import { meetsRole } from "@/lib/roles"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

// Rango por defecto: últimos 7 días.
function ultimaSemanaISO(): { desde: string; hasta: string } {
  const hasta = new Date()
  const desde = new Date(hasta.getTime() - 7 * 86400000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: iso(desde), hasta: iso(hasta) }
}

export default function AuditoriaPage() {
  const rango = ultimaSemanaISO()
  const [desde, setDesde] = useState<string>(rango.desde)
  const [hasta, setHasta] = useState<string>(rango.hasta)
  const [usuarioId, setUsuarioId] = useState<string>("")
  const [grupo, setGrupo] = useState<string>(ALL)
  const [entidades, setEntidades] = useState<Set<string>>(new Set())
  const [acciones, setAcciones] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState<string>("")
  const [todosLosProyectos, setTodosLosProyectos] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const userRoles = useAuthStore((s) => s.user?.roles)
  const esSuperAdmin = meetsRole(userRoles, "SuperAdmin")
  const { data: usuariosData } = useGetUsuarios({ pageSize: 200 })
  const usuarios = usuariosData?.data ?? []

  const filtros: AuditoriaFiltros = {
    desde: desde || undefined,
    hasta: hasta || undefined,
    usuarioId: usuarioId || undefined,
    entidades: entidades.size > 0 ? Array.from(entidades) : undefined,
    acciones: acciones.size > 0 ? Array.from(acciones) : undefined,
    search: search || undefined,
  }

  const { data, isLoading, isFetching } = useAuditoria(filtros, page, pageSize, esSuperAdmin && todosLosProyectos)
  const paged = data?.data
  const items = paged?.items ?? []
  const total = paged?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const entidadesGrupo = useMemo(() => {
    if (grupo === ALL) return null
    return ENTIDAD_GRUPOS.find((g) => g.key === grupo)?.entidades ?? []
  }, [grupo])

  function toggleEntidad(e: string) {
    setEntidades((prev) => {
      const next = new Set(prev)
      if (next.has(e)) next.delete(e); else next.add(e)
      setPage(1)
      return next
    })
  }
  function toggleAccion(a: string) {
    setAcciones((prev) => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a); else next.add(a)
      setPage(1)
      return next
    })
  }
  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-blue-700" />
            Control de cambios
          </h1>
          <p className="text-sm text-muted-foreground max-w-4xl">
            Registro de todas las creaciones, modificaciones y eliminaciones de datos del
            proyecto. Filtrá por fecha, usuario o tipo de entidad y descargá el log a Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => descargarAuditoriaExcel(filtros, esSuperAdmin && todosLosProyectos)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-white p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Desde</label>
            <Input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPage(1) }}
              className="h-9 mt-0.5"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Hasta</label>
            <Input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPage(1) }}
              className="h-9 mt-0.5"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Usuario</label>
            <Select value={usuarioId || ALL} onValueChange={(v) => { setUsuarioId(v === ALL ? "" : (v ?? "")); setPage(1) }}>
              <SelectTrigger className="mt-0.5 h-9">
                <SelectValue placeholder="Todos">
                  {usuarioId
                    ? usuarios.find((u) => u.id === usuarioId)?.nombre ?? usuarioId
                    : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nombre || u.email || u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Grupo</label>
            <Select value={grupo} onValueChange={(v) => { setGrupo(v ?? ALL); setEntidades(new Set()); setPage(1) }}>
              <SelectTrigger className="mt-0.5 h-9">
                <SelectValue placeholder="Todos">
                  {grupo === ALL ? "Todos los grupos" : ENTIDAD_GRUPOS.find((g) => g.key === grupo)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los grupos</SelectItem>
                {ENTIDAD_GRUPOS.map((g) => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] text-muted-foreground font-medium">Búsqueda</label>
            <Input
              value={search}
              placeholder="ID, usuario…"
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-9 mt-0.5"
            />
          </div>
        </div>

        {/* Chips: entidades del grupo elegido */}
        {entidadesGrupo && entidadesGrupo.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">Entidades:</span>
            {entidadesGrupo.map((e) => {
              const activa = entidades.has(e)
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEntidad(e)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    activa
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {labelEntidad(e)}
                </button>
              )
            })}
            {entidades.size > 0 && (
              <button
                type="button"
                onClick={() => { setEntidades(new Set()); setPage(1) }}
                className="text-[11px] text-muted-foreground underline ml-1"
              >
                limpiar
              </button>
            )}
          </div>
        )}

        {/* Chips: acciones */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Acciones:</span>
          {ACCIONES.map((a) => {
            const activa = acciones.has(a)
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAccion(a)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  activa
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {a}
              </button>
            )
          })}
          {acciones.size > 0 && (
            <button
              type="button"
              onClick={() => { setAcciones(new Set()); setPage(1) }}
              className="text-[11px] text-muted-foreground underline ml-1"
            >
              limpiar
            </button>
          )}
          {esSuperAdmin && (
            <label className="ml-auto flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={todosLosProyectos}
                onChange={(e) => { setTodosLosProyectos(e.target.checked); setPage(1) }}
                className="h-4 w-4 accent-blue-900"
              />
              Ver TODOS los proyectos
            </label>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-40">Fecha</TableHead>
              <TableHead className="w-48">Usuario</TableHead>
              <TableHead className="w-44">Entidad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-28">Acción</TableHead>
              <TableHead className="w-24 text-right">Cambios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Sin actividad para los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => {
                const abierto = expandidos.has(it.id)
                const tieneCambios = it.cambios.length > 0
                return (
                  <Fragment key={it.id}>
                    <TableRow className="hover:bg-blue-50/40">
                      <TableCell className="py-2" onClick={() => { if (tieneCambios) toggleExpandido(it.id) }}>
                        {tieneCambios && (
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 text-gray-500"
                            aria-label={abierto ? "Colapsar" : "Expandir"}
                          >
                            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs whitespace-nowrap">
                        {new Date(it.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium" })}
                      </TableCell>
                      <TableCell className="py-2 text-sm">
                        <div className="font-medium">{it.usuarioNombre ?? "—"}</div>
                        {it.ipAddress && (
                          <div className="text-[10px] text-muted-foreground">{it.ipAddress}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm">
                        {labelEntidad(it.entidad)}
                        {it.entidad !== labelEntidad(it.entidad) && (
                          <div className="text-[10px] text-muted-foreground font-mono">{it.entidad}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {it.entidadResumen ? (
                          <>
                            <div className="text-sm font-medium text-gray-900">{it.entidadResumen}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-xs">{it.entidadId}</div>
                          </>
                        ) : (
                          <div className="font-mono">{it.entidadId}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ACCION_BADGE[it.accion] ?? "bg-gray-100 text-gray-700"}`}>
                          {it.accion}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs text-muted-foreground tabular-nums">
                        {it.cambios.length}
                      </TableCell>
                    </TableRow>
                    {abierto && tieneCambios && (
                      <TableRow className="bg-gray-50/70">
                        <TableCell colSpan={7} className="py-3">
                          <DiffTable cambios={it.cambios} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {isFetching && !isLoading && <span><Loader2 className="inline h-3 w-3 animate-spin mr-1" /> </span>}
          {total.toLocaleString("es-AR")} registro(s) — página {page} de {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}

function DiffTable({ cambios }: { cambios: import("@/features/auditoria/types").AuditoriaCambio[] }) {
  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="text-left px-3 py-1.5 font-semibold w-52">Campo</th>
            <th className="text-left px-3 py-1.5 font-semibold">Anterior</th>
            <th className="text-left px-3 py-1.5 font-semibold">Nuevo</th>
          </tr>
        </thead>
        <tbody>
          {cambios.map((c) => (
            <tr key={c.campo} className="border-t border-gray-100">
              <td className="px-3 py-1.5 font-medium text-gray-800">{labelCampo(c.campo)}</td>
              <td className="px-3 py-1.5 text-red-700 line-through/none">{formatValor(c.anterior)}</td>
              <td className="px-3 py-1.5 text-green-700 font-medium">{formatValor(c.nuevo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatValor(v: string | null): string {
  if (v == null || v === "") return "—"
  return v
}
