"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { useGetTestGroups } from "@/features/testgroups/api/use-get-testgroups"
import {
  ESTADO_TEST_GROUP, TIPO_TEST_GROUP, type EstadoTestGroup, type TipoTestGroup,
} from "@/features/testgroups/types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

// Por default mostramos los packs "en ejecución" (ACTIVO + COMPLETADO). BORRADOR y
// CERRADO viven en Alcance / archivo; el user puede pedirlos con el filtro.
const DEFAULT_ESTADOS: EstadoTestGroup[] = [
  ESTADO_TEST_GROUP.ACTIVO,
  ESTADO_TEST_GROUP.COMPLETADO,
]

export default function EjecucionTestGroupsPage() {
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState<string>(ALL)
  const [subFilter, setSubFilter] = useState<string>(ALL)
  const [espFilter, setEspFilter] = useState<string>(ALL)
  const [estadoFilter, setEstadoFilter] = useState<string>("en-ejecucion")
  const [page, setPage] = useState(1)
  const pageSize = 15

  const estados: EstadoTestGroup[] | undefined =
    estadoFilter === "en-ejecucion" ? DEFAULT_ESTADOS
    : estadoFilter === "todos" ? undefined
    : [Number(estadoFilter) as EstadoTestGroup]

  const tipoParam: TipoTestGroup | undefined =
    tipoFilter === ALL ? undefined : (parseInt(tipoFilter, 10) as TipoTestGroup)

  const { data, isLoading, isFetching } = useGetTestGroups({
    page, pageSize,
    nombre: search || undefined,
    tipo: tipoParam,
    subSistemaId: subFilter === ALL ? undefined : subFilter,
    especialidadId: espFilter === ALL ? undefined : espFilter,
    estados,
  })

  const { data: subsData } = useGetSubSistemasSelect()
  const subs = subsData?.data ?? []
  const { data: espData } = useGetEspecialidadesUsadas()
  const especialidades = espData?.data ?? []

  const packs = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-lg border bg-card p-3 flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>

        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v ?? "en-ejecucion"); setPage(1) }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Estado">
              {estadoFilter === "en-ejecucion" ? "En ejecución (activo+completado)"
                : estadoFilter === "todos" ? "Todos los estados"
                : estadoFilter === String(ESTADO_TEST_GROUP.BORRADOR) ? "Borrador"
                : estadoFilter === String(ESTADO_TEST_GROUP.ACTIVO) ? "Activo"
                : estadoFilter === String(ESTADO_TEST_GROUP.COMPLETADO) ? "Completado"
                : estadoFilter === String(ESTADO_TEST_GROUP.CERRADO) ? "Cerrado"
                : "Estado"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-ejecucion">En ejecución (activo+completado)</SelectItem>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value={String(ESTADO_TEST_GROUP.BORRADOR)}>Borrador</SelectItem>
            <SelectItem value={String(ESTADO_TEST_GROUP.ACTIVO)}>Activo</SelectItem>
            <SelectItem value={String(ESTADO_TEST_GROUP.COMPLETADO)}>Completado</SelectItem>
            <SelectItem value={String(ESTADO_TEST_GROUP.CERRADO)}>Cerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v ?? ALL); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los tipos">
              {tipoFilter === ALL ? "Todos los tipos"
                : tipoFilter === String(TIPO_TEST_GROUP.PRESSURE) ? "Pressure Test Pack"
                : "Basic Function"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            <SelectItem value={String(TIPO_TEST_GROUP.PRESSURE)}>Pressure Test Pack</SelectItem>
            <SelectItem value={String(TIPO_TEST_GROUP.BASIC_FUNCTION)}>Basic Function</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subFilter} onValueChange={(v) => { setSubFilter(v ?? ALL); setPage(1) }}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Todos los subsistemas">
              {(() => {
                if (subFilter === ALL) return "Todos los subsistemas"
                const s = subs.find((x) => x.id === subFilter)
                return s ? `${s.codigo} — ${s.nombre}` : "Todos los subsistemas"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
            {subs.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={espFilter} onValueChange={(v) => { setEspFilter(v ?? ALL); setPage(1) }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todas las especialidades">
              {(() => {
                if (espFilter === ALL) return "Todas las especialidades"
                const e = especialidades.find((x) => x.id === espFilter)
                return e ? (e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre) : "Todas las especialidades"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las especialidades</SelectItem>
            {especialidades.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className={`rounded-lg border bg-card overflow-hidden ${isFetching && !isLoading ? "opacity-70" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead className="w-32">Tipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-64">Subsistema</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-56">Progreso</TableHead>
              <TableHead className="w-24 text-right">Elementos</TableHead>
              <TableHead className="w-24 text-right">Tareas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : packs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Sin paquetes que cumplan los filtros.
                </TableCell>
              </TableRow>
            ) : (
              packs.map((tg) => (
                <TableRow key={tg.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Link
                      href={`/ejecucion/test-groups/${tg.id}`}
                      className="font-mono text-sm font-medium text-blue-700 hover:underline"
                    >
                      {tg.codigo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tg.tipo === TIPO_TEST_GROUP.PRESSURE ? "default" : "secondary"}>
                      {tg.tipo === TIPO_TEST_GROUP.PRESSURE ? "Pressure" : "Basic Function"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{tg.nombre || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tg.subSistemaCodigo ? `${tg.subSistemaCodigo} — ${tg.subSistemaNombre}` : "—"}
                  </TableCell>
                  <TableCell><EstadoBadge estado={tg.estado} texto={tg.estadoTexto} /></TableCell>
                  <TableCell>
                    <ProgresoBar tareasTerminales={tg.cantidadTareasTerminales} total={tg.cantidadTareas} porcentaje={tg.porcentajeAvance} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{tg.cantidadElementos}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{tg.cantidadTareas}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} paquete(s) en total</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EstadoBadge({ estado, texto }: { estado: number; texto: string }) {
  const cls =
    estado === ESTADO_TEST_GROUP.BORRADOR ? "border-gray-300 text-gray-700 bg-gray-50" :
    estado === ESTADO_TEST_GROUP.ACTIVO ? "border-blue-300 text-blue-700 bg-blue-50" :
    estado === ESTADO_TEST_GROUP.COMPLETADO ? "border-green-300 text-green-700 bg-green-50" :
    "border-slate-400 text-slate-700 bg-slate-100"
  return <Badge variant="outline" className={cls}>{texto}</Badge>
}

function ProgresoBar({
  tareasTerminales, total, porcentaje,
}: {
  tareasTerminales: number; total: number; porcentaje: number
}) {
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">Sin tareas instanciadas</span>
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full transition-all ${porcentaje >= 100 ? "bg-green-600" : "bg-blue-600"}`}
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-20 text-right">
        {tareasTerminales}/{total} · {porcentaje}%
      </span>
    </div>
  )
}
