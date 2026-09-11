"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Plus, Search } from "lucide-react"

import { useSearchNoConformidades } from "@/features/no-conformidades/api/use-no-conformidades"
import {
  useGetNcEstados,
  useGetNcMotivos,
  useGetNcTipos,
} from "@/features/no-conformidades/api/use-catalogos"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import {
  NC_ESTADO_COLOR,
  NC_ESTADO_LABEL,
  NC_SEVERIDAD,
  NC_SEVERIDAD_COLOR,
} from "@/features/no-conformidades/types"
import { NewNoConformidadSheet } from "@/features/no-conformidades/components/new-nc-sheet"
import { useCanWrite } from "@/lib/use-roles"

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
/** Valor especial del select de estado: se traduce a `soloAbiertos` en el filtro. */
const OPEN = "__open__"

export default function NoConformidadesPage() {
  // Suspense obligatorio en Next 16 para componentes que hacen bailout de
  // pre-render estático.
  return (
    <Suspense>
      <NoConformidadesPageContent />
    </Suspense>
  )
}

function NoConformidadesPageContent() {
  const canWrite = useCanWrite()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [tipoId, setTipoId] = useState("")
  const [estadoSel, setEstadoSel] = useState<string>(OPEN)
  const [motivoId, setMotivoId] = useState("")
  const [severidad, setSeveridad] = useState("")
  const [grupoAfectadoId, setGrupoAfectadoId] = useState("")
  const [soloMios, setSoloMios] = useState(false)
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [page, setPage] = useState(1)

  const [nuevoAbierto, setNuevoAbierto] = useState(false)

  const tipos = useGetNcTipos()
  const estados = useGetNcEstados()
  const motivos = useGetNcMotivos()
  const grupos = useGetUsuariosGrupos()

  const filter = useMemo(
    () => ({
      search: search.trim() || undefined,
      tipoId: tipoId || undefined,
      estadoId: estadoSel !== OPEN && estadoSel !== ALL ? estadoSel : undefined,
      soloAbiertos: estadoSel === OPEN ? true : undefined,
      motivoId: motivoId || undefined,
      severidad: severidad ? Number(severidad) : undefined,
      grupoAfectadoId: grupoAfectadoId || undefined,
      soloMios: soloMios || undefined,
      soloEficaciaVencida: soloVencidas || undefined,
    }),
    [search, tipoId, estadoSel, motivoId, severidad, grupoAfectadoId, soloMios, soloVencidas],
  )

  const { data, isLoading, isError } = useSearchNoConformidades({
    page,
    pageSize: 20,
    filter,
  })

  const filas = data?.data ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">No Conformidades</h1>
          <p className="text-sm text-muted-foreground">
            No Conformidades, Solicitudes de Acción Correctiva y de Oportunidad de Mejora.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setNuevoAbierto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo informe
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por código, título o causa raíz…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <Select
          value={estadoSel}
          onValueChange={(v) => {
            setEstadoSel(v ?? OPEN)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[210px]">
            {/* Sin children, SelectValue muestra el value crudo (el GUID). */}
            <SelectValue>
              {(() => {
                if (estadoSel === OPEN) return "Todos los abiertos"
                if (estadoSel === ALL) return "Todos los estados"
                const e = (estados.data?.data ?? []).find((x) => x.id === estadoSel)
                return NC_ESTADO_LABEL[e?.estado ?? ""] ?? e?.estado ?? "Estado"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OPEN}>Todos los abiertos</SelectItem>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {(estados.data?.data ?? []).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {NC_ESTADO_LABEL[e.estado] ?? e.estado}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={tipoId || ALL}
          onValueChange={(v) => {
            setTipoId(!v || v === ALL ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue>
              {(() => {
                const t = (tipos.data?.data ?? []).find((x) => x.id === tipoId)
                return t ? `${t.codigo} — ${t.nombre}` : "Todos los tipos"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            {(tipos.data?.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.codigo} — {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severidad || ALL}
          onValueChange={(v) => {
            setSeveridad(!v || v === ALL ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue>
              {severidad ? NC_SEVERIDAD[Number(severidad)] : "Toda severidad"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toda severidad</SelectItem>
            <SelectItem value="2">Mayor</SelectItem>
            <SelectItem value="1">Menor</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={motivoId || ALL}
          onValueChange={(v) => {
            setMotivoId(!v || v === ALL ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {(motivos.data?.data ?? []).find((m) => m.id === motivoId)?.nombre ??
                "Todos los motivos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los motivos</SelectItem>
            {(motivos.data?.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={grupoAfectadoId || ALL}
          onValueChange={(v) => {
            setGrupoAfectadoId(!v || v === ALL ? "" : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[210px]">
            <SelectValue>
              {(grupos.data?.data ?? []).find((g) => g.id === grupoAfectadoId)?.nombre ??
                "Todas las áreas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las áreas</SelectItem>
            {(grupos.data?.data ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nombre}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Button
          variant={soloMios ? "default" : "outline"}
          onClick={() => {
            setSoloMios((v) => !v)
            setPage(1)
          }}
        >
          Míos
        </Button>

        <Button
          variant={soloVencidas ? "default" : "outline"}
          onClick={() => {
            setSoloVencidas((v) => !v)
            setPage(1)
          }}
          title="Informes cuya fecha de medición de eficacia venció sin resultado cargado"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Eficacia vencida
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-[100px]">Severidad</TableHead>
              <TableHead className="w-[190px]">Estado</TableHead>
              <TableHead className="w-[190px]">Área afectada</TableHead>
              <TableHead className="w-[120px]">Detección</TableHead>
              <TableHead className="w-[120px]">Compromiso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-destructive">
                  No se pudo cargar el listado.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay informes que coincidan con el filtro.
                </TableCell>
              </TableRow>
            )}

            {filas.map((n) => (
              <TableRow
                key={n.id}
                className="cursor-pointer"
                onClick={() => router.push(`/calidad/no-conformidades/${n.id}`)}
              >
                <TableCell className="font-mono text-xs font-semibold">
                  <Link
                    href={`/calidad/no-conformidades/${n.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {n.codigoFormateado}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{n.titulo}</div>
                  {n.subSistemaCodigo && (
                    <div className="text-xs text-muted-foreground">
                      {n.subSistemaCodigo}
                      {n.elementoTag ? ` · ${n.elementoTag}` : ""}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      NC_SEVERIDAD_COLOR[n.severidad] ?? ""
                    }`}
                  >
                    {NC_SEVERIDAD[n.severidad] ?? n.severidad}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      NC_ESTADO_COLOR[n.estadoNombre] ?? ""
                    }`}
                  >
                    {NC_ESTADO_LABEL[n.estadoNombre] ?? n.estadoNombre}
                  </span>
                  {n.eficaciaVencida && (
                    <span
                      className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                      title="La fecha de medición de eficacia venció sin resultado"
                    >
                      vencida
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{n.grupoAfectadoNombre}</TableCell>
                <TableCell className="text-sm">{fecha(n.fechaDeteccion)}</TableCell>
                <TableCell className="text-sm">{fecha(n.fechaCompromiso)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginado */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} informe{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>
            {page} / {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPaginas}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <NewNoConformidadSheet
        open={nuevoAbierto}
        onOpenChange={setNuevoAbierto}
        onCreada={(id) => {
          setNuevoAbierto(false)
          router.push(`/calidad/no-conformidades/${id}`)
        }}
      />
    </div>
  )
}

/** El backend manda DateOnly como "2026-09-10". Se muestra dd/mm/aaaa sin pasar por Date. */
function fecha(v: string | null | undefined) {
  if (!v) return "—"
  const [y, m, d] = v.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}
