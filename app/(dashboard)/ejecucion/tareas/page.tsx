"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FileDown, FileSpreadsheet, FileText, Loader2, Package } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"
import { useGetElementosTiposUsados } from "@/features/elementostipos/api/use-get-elementostipos-usados"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"

import {
  descargarTareasExcel,
  useTareasListado,
} from "@/features/tareas-listado/api/use-tareas-listado"
import { ESTADO_ET, ESTADO_ET_LABEL, type EstadoET, type TareasListadoFiltros } from "@/features/tareas-listado/types"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

const ESTADOS_OPCIONES: Array<{ value: EstadoET; label: string }> = [
  { value: ESTADO_ET.PENDIENTE,  label: "Pendiente" },
  { value: ESTADO_ET.EN_PROCESO, label: "En proceso" },
  { value: ESTADO_ET.COMPLETADO, label: "Completado" },
  { value: ESTADO_ET.APROBADO,   label: "Firmado físico" },
  { value: ESTADO_ET.RECHAZADO,  label: "Rechazado" },
  { value: ESTADO_ET.FIRMADO,    label: "Firmado" },
]

const ESTADO_BADGE: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-amber-100 text-amber-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-green-100 text-green-800",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-200 text-gray-600",
  7: "bg-emerald-100 text-emerald-800",
}

interface NivelLike { id: string; nombre: string; posicion: number }
interface TipoLike { id: string; nombre: string; especialidadId?: string }
interface EspecialidadLike { id: string; codigo?: string | null; nombre: string }

export default function TareasListadoPage() {
  const router = useRouter()
  const { data: perfil } = useGetPerfil()
  const { data: proyectoRaw } = useGetProyecto(perfil?.proyectoId ?? null)
  const permitirFisico = proyectoRaw?.data?.permitirRegistroFisico ?? false

  // Filtros
  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>("")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [elementoTipoId, setElementoTipoId] = useState<string>("")
  const [nivelId, setNivelId] = useState<string>("")
  const [estados, setEstados] = useState<Set<EstadoET>>(new Set())
  const [search, setSearch] = useState<string>("")

  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  const { data: sistemasData } = useGetSistemasSelect()
  const { data: subsData } = useGetSubSistemasSelect()
  const { data: espData } = useGetEspecialidadesUsadas()
  const { data: tiposData } = useGetElementosTiposUsados()
  const { data: nivelesData } = useGetNivelesUsadosSelect()

  const sistemas = sistemasData?.data ?? []
  const subs = (subsData?.data ?? []).filter((s) => !sistemaId || s.sistemaId === sistemaId)
  const especialidades = (espData?.data ?? []) as EspecialidadLike[]
  const tiposElem = ((tiposData as any)?.data ?? []) as TipoLike[]
  const niveles = ((nivelesData as any)?.data ?? []) as NivelLike[]

  const tiposFiltrados = useMemo(
    () => (especialidadId ? tiposElem.filter((t) => t.especialidadId === especialidadId) : tiposElem),
    [tiposElem, especialidadId],
  )

  const filtros: TareasListadoFiltros = {
    sistemaId: sistemaId || undefined,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
    elementoTipoId: elementoTipoId || undefined,
    nivelId: nivelId || undefined,
    estados: estados.size > 0 ? Array.from(estados) : undefined,
    search: search || undefined,
  }

  const { data, isLoading, isFetching } = useTareasListado(filtros, page, pageSize)
  const paged = data?.data
  const items = paged?.items ?? []
  const total = paged?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Selección para bulk download de planillas (sólo ET con planillaId).
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [descargandoZip, setDescargandoZip] = useState(false)
  const [zipError, setZipError] = useState<string | null>(null)

  const puedeBulk = seleccion.size > 0
  const seleccionablesVisibles = items.filter((it) => !!it.planillaId).map((it) => it.elementoTareaId)
  const todasVisiblesSeleccionadas = seleccionablesVisibles.length > 0
    && seleccionablesVisibles.every((id) => seleccion.has(id))

  function toggleSeleccion(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleTodasVisibles() {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (todasVisiblesSeleccionadas) {
        for (const id of seleccionablesVisibles) next.delete(id)
      } else {
        for (const id of seleccionablesVisibles) next.add(id)
      }
      return next
    })
  }
  function limpiarSeleccion() {
    setSeleccion(new Set())
  }

  async function descargarZipPlanillas() {
    if (seleccion.size === 0) return
    setZipError(null)
    setDescargandoZip(true)
    try {
      const res = await fetch("/api/planillas/pdf/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elementoTareaIds: Array.from(seleccion),
          agruparPorTarea: true,
        }),
      })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(errorBody || `Error ${res.status} al generar el ZIP`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const cd = res.headers.get("content-disposition") ?? ""
      const m = /filename="?([^"]+)"?/.exec(cd)
      a.download = m?.[1] ?? "Planillas_Bulk.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setZipError((e as Error).message)
    } finally {
      setDescargandoZip(false)
    }
  }

  // Al cambiar filtros vamos a la página 1 y limpiamos selección.
  function resetFiltrado() {
    setPage(1)
    setSeleccion(new Set())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Listado de tareas</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Todas las tareas del proyecto con filtros y descarga a Excel. Podés seleccionar
            varias filas y bajar las planillas en blanco como un ZIP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => descargarTareasExcel(filtros)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-white p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <SelectFiltro
            label="Sistema"
            value={sistemaId}
            onChange={(v) => { setSistemaId(v); setSubSistemaId(""); resetFiltrado() }}
            opciones={sistemas.map((s) => ({ value: s.id, label: `${s.codigo} — ${s.nombre}` }))}
          />
          <SelectFiltro
            label="Subsistema"
            value={subSistemaId}
            onChange={(v) => { setSubSistemaId(v); resetFiltrado() }}
            opciones={subs.map((s) => ({ value: s.id, label: `${s.codigo} — ${s.nombre}` }))}
          />
          <SelectFiltro
            label="Especialidad"
            value={especialidadId}
            onChange={(v) => { setEspecialidadId(v); setElementoTipoId(""); resetFiltrado() }}
            opciones={especialidades.map((e) => ({
              value: e.id,
              label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
            }))}
          />
          <SelectFiltro
            label="Tipo elemento"
            value={elementoTipoId}
            onChange={(v) => { setElementoTipoId(v); resetFiltrado() }}
            opciones={tiposFiltrados.map((t) => ({ value: t.id, label: t.nombre }))}
          />
          <SelectFiltro
            label="Nivel"
            value={nivelId}
            onChange={(v) => { setNivelId(v); resetFiltrado() }}
            opciones={niveles
              .slice()
              .sort((a, b) => a.posicion - b.posicion)
              .map((n) => ({ value: n.id, label: n.nombre }))}
          />
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Búsqueda</label>
            <Input
              value={search}
              placeholder="Tag / nombre / código…"
              onChange={(e) => { setSearch(e.target.value); resetFiltrado() }}
              className="h-9 mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Estado:</span>
          {ESTADOS_OPCIONES.map((o) => {
            const activo = estados.has(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setEstados((prev) => {
                    const next = new Set(prev)
                    if (next.has(o.value)) next.delete(o.value); else next.add(o.value)
                    return next
                  })
                  resetFiltrado()
                }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  activo
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            )
          })}
          {estados.size > 0 && (
            <button
              type="button"
              onClick={() => { setEstados(new Set()); resetFiltrado() }}
              className="text-[11px] text-muted-foreground underline ml-1"
            >
              limpiar
            </button>
          )}
        </div>
      </div>

      {/* Toolbar de selección */}
      {seleccion.size > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-blue-900">
            <strong>{seleccion.size}</strong> tarea(s) seleccionada(s) para descarga de planillas en blanco.
          </span>
          <Button
            size="sm"
            onClick={descargarZipPlanillas}
            disabled={descargandoZip}
            className="gap-2"
          >
            {descargandoZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
            Descargar {seleccion.size} planillas (ZIP)
          </Button>
          <button
            type="button"
            onClick={limpiarSeleccion}
            className="text-xs text-blue-800 underline"
          >
            Limpiar selección
          </button>
          {zipError && <span className="text-xs text-red-700">{zipError}</span>}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={todasVisiblesSeleccionadas}
                  disabled={seleccionablesVisibles.length === 0}
                  onChange={toggleTodasVisibles}
                  className="h-4 w-4 accent-blue-900"
                  aria-label="Seleccionar todas las visibles con planilla"
                />
              </TableHead>
              <TableHead className="w-28">TAG</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead className="w-28">Estado</TableHead>
              <TableHead className="w-24">Código</TableHead>
              <TableHead className="w-32">Nivel</TableHead>
              <TableHead className="w-40">Sistema</TableHead>
              <TableHead className="w-40">Subsistema</TableHead>
              <TableHead className="w-40">Especialidad / Tipo</TableHead>
              <TableHead className="w-24">Prioridad</TableHead>
              <TableHead className="w-28">Fecha estim.</TableHead>
              <TableHead className="w-28">Finalizado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
                  Sin tareas para los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => {
                const seleccionable = !!it.planillaId
                const checked = seleccion.has(it.elementoTareaId)
                return (
                  <TableRow key={it.elementoTareaId} className="hover:bg-blue-50/30">
                    <TableCell>
                      <input
                        type="checkbox"
                        disabled={!seleccionable}
                        checked={checked}
                        onChange={() => toggleSeleccion(it.elementoTareaId)}
                        className="h-4 w-4 accent-blue-900"
                        aria-label="Seleccionar"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.tag}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{it.tareaNombre}</div>
                      {it.elementoNombre && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{it.elementoNombre}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[it.estado] ?? "bg-gray-100 text-gray-600"}`}>
                        {ESTADO_ET_LABEL[it.estado] ?? it.estadoTexto}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                    <TableCell className="text-xs">{it.nivelNombre ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {it.sistemaCodigo ?? "—"}
                      {it.sistemaNombre && <div className="text-[10px] text-muted-foreground truncate max-w-40">{it.sistemaNombre}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {it.subSistemaCodigo ?? "—"}
                      {it.subSistemaNombre && <div className="text-[10px] text-muted-foreground truncate max-w-40">{it.subSistemaNombre}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {it.especialidadNombre ?? "—"}
                      {it.elementoTipoNombre && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-40">
                          {it.elementoTipoNombre}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{it.prioridadTexto}</TableCell>
                    <TableCell className="text-xs">{fmtFecha(it.fechaEstimada)}</TableCell>
                    <TableCell className="text-xs">{fmtFecha(it.fechaFinalizacion)}</TableCell>
                    <TableCell className="text-right">
                      <AccionesFila
                        row={it}
                        permitirFisico={permitirFisico}
                        onIrARegistro={() => router.push(`/ejecucion/registros/${it.registroId}?returnTo=/ejecucion/tareas`)}
                        onIrAElemento={() => router.push(`/ejecucion/elementos?subSistemaId=${it.subSistemaId}&elementoId=${it.elementoId}`)}
                      />
                    </TableCell>
                  </TableRow>
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
          {total.toLocaleString("es-AR")} tarea(s) — página {page} de {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}

function SelectFiltro({
  label, value, onChange, opciones,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : (v ?? ""))}>
        <SelectTrigger className="mt-0.5 h-9">
          <SelectValue placeholder={`Todos`}>
            {value ? opciones.find((o) => o.value === value)?.label ?? "Todos" : "Todos"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function AccionesFila({
  row, permitirFisico, onIrARegistro, onIrAElemento,
}: {
  row: import("@/features/tareas-listado/types").TareaListadoRow
  permitirFisico: boolean
  onIrARegistro: () => void
  onIrAElemento: () => void
}) {
  const tienePlanilla = !!row.planillaId
  const tieneRegistro = !!row.registroId
  const urlBlanco = tienePlanilla
    ? `/api/planillas/${row.planillaId}/pdf/blanco/${row.elementoTareaId}`
    : null

  return (
    <div className="flex items-center gap-1 justify-end">
      {tieneRegistro && (
        row.registroEsFisico ? (
          <a
            href={`/api/registros/${row.registroId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Descargar PDF del registro físico"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            title="Ir al registro (completar o ver)"
            onClick={onIrARegistro}
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        )
      )}
      {tienePlanilla && permitirFisico && urlBlanco && (
        <a
          href={urlBlanco}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
          title="Descargar planilla en blanco"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        title="Ver elemento"
        onClick={onIrAElemento}
      >
        <FileDown className="h-3.5 w-3.5 rotate-180" />
      </Button>
    </div>
  )
}

function fmtFecha(f: string | null): string {
  if (!f) return "—"
  const d = new Date(f)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}
