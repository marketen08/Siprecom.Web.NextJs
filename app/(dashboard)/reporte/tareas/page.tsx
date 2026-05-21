"use client"

import { useMemo, useState, Suspense } from "react"
import { Download, Loader2, PenLine } from "lucide-react"

import {
  buildTareasRealizadasPdfUrl,
  useGetTareasRealizadasPreview,
} from "@/features/reportes/api/use-tareas-realizadas"
import { downloadPdf } from "@/features/estadisticas/api/download-pdf"
import type {
  TareaRealizadaItem,
  TareasRealizadasFiltros,
  TareasRealizadasUsuarioStats,
} from "@/features/reportes/types"

import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"

const ALL = "__all__"

const ESTADO_LABEL: Record<number, string> = {
  1: "Completado",
  4: "Aprobado",
  7: "Firmado",
}

const ESTADO_BADGE: Record<number, string> = {
  1: "bg-blue-100 text-blue-800",
  4: "bg-green-100 text-green-800",
  7: "bg-emerald-100 text-emerald-800",
}

// "YYYY-MM-DD" en local TZ — el input type="date" trabaja con este formato.
function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}
function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
  } catch {
    return iso
  }
}

function TareasRealizadasContent() {
  // Default: últimos 30 días.
  const hoy = useMemo(() => new Date(), [])
  const haceTreintaDias = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }, [])

  const [fechaDesde, setFechaDesde] = useState<string>(toDateInput(haceTreintaDias))
  const [fechaHasta, setFechaHasta] = useState<string>(toDateInput(hoy))
  const [usuarioId, setUsuarioId] = useState<string>("")
  const [estado, setEstado] = useState<string>("")
  const [nivelId, setNivelId] = useState<string>("")
  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>("")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Catálogos
  const sistemas         = useGetSistemasSelect().data?.data ?? []
  const todosSubSistemas = useGetSubSistemasSelect().data?.data ?? []
  const niveles          = (useGetNivelesSelect().data as { data?: Array<{ id: string; nombre: string; posicion: number }> })?.data ?? []
  const especialidades   = useGetEspecialidades().data?.data ?? []
  const usuarios         = (useGetUsuarios({ page: 1, pageSize: 200, isLocked: false }).data as any)?.data ?? []

  const subSistemasFiltrados = sistemaId
    ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId)
    : todosSubSistemas

  // ISO strings al backend con hora 00:00 desde y 23:59:59 hasta los cubre el server.
  const filtros = useMemo<TareasRealizadasFiltros>(() => ({
    fechaDesde:     fechaDesde ? new Date(fechaDesde).toISOString() : undefined,
    fechaHasta:     fechaHasta ? new Date(fechaHasta).toISOString() : undefined,
    usuarioId:      usuarioId      || undefined,
    estado:         estado ? Number(estado) : undefined,
    nivelId:        nivelId        || undefined,
    sistemaId:      sistemaId      || undefined,
    subSistemaId:   subSistemaId   || undefined,
    especialidadId: especialidadId || undefined,
  }), [fechaDesde, fechaHasta, usuarioId, estado, nivelId, sistemaId, subSistemaId, especialidadId])

  const { data, isLoading, isFetching } = useGetTareasRealizadasPreview(filtros)
  const preview = data?.data

  function aplicarPreset(dias: number) {
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)
    setFechaDesde(toDateInput(desde))
    setFechaHasta(toDateInput(new Date()))
  }

  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    if (id && subSistemaId) {
      const ss = todosSubSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) setSubSistemaId("")
    }
  }

  function handleClearFiltros() {
    setFechaDesde(toDateInput(haceTreintaDias))
    setFechaHasta(toDateInput(new Date()))
    setUsuarioId("")
    setEstado("")
    setNivelId("")
    setSistemaId("")
    setSubSistemaId("")
    setEspecialidadId("")
  }

  const nivelSel        = niveles.find((n) => n.id === nivelId)
  const sistemaSel      = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSel   = todosSubSistemas.find((ss) => ss.id === subSistemaId)
  const especialidadSel = especialidades.find((e) => e.id === especialidadId)
  const usuarioSel      = usuarios.find((u: any) => u.id === usuarioId)

  // Chips de filtros NO incluyen el rango de fechas (es el filtro principal y se ve siempre).
  const activeFilters: FilterChip[] = []
  if (estado) activeFilters.push({
    id: "estado",
    label: `Estado: ${ESTADO_LABEL[Number(estado)] ?? "—"}`,
    onRemove: () => setEstado(""),
  })
  if (usuarioId) activeFilters.push({
    id: "usuario",
    label: `Usuario: ${usuarioSel?.userName ?? usuarioSel?.nombre ?? "—"}`,
    onRemove: () => setUsuarioId(""),
  })
  if (nivelId) activeFilters.push({
    id: "nivel",
    label: `Nivel: ${nivelSel?.nombre ?? "—"}`,
    onRemove: () => setNivelId(""),
  })
  if (sistemaId) activeFilters.push({
    id: "sistema",
    label: `Sistema: ${sistemaSel ? `${sistemaSel.codigo} — ${sistemaSel.nombre}` : "—"}`,
    onRemove: () => handleSistemaChange(ALL),
  })
  if (subSistemaId) activeFilters.push({
    id: "subsistema",
    label: `Subsistema: ${subSistemaSel ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}` : "—"}`,
    onRemove: () => setSubSistemaId(""),
  })
  if (especialidadId) activeFilters.push({
    id: "especialidad",
    label: `Especialidad: ${especialidadSel?.nombre ?? "—"}`,
    onRemove: () => setEspecialidadId(""),
  })

  async function descargar() {
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadPdf(buildTareasRealizadasPdfUrl(filtros), "tareas-realizadas.pdf")
    } catch (e) {
      setDownloadError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas realizadas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tareas completadas/firmadas/aprobadas en el rango seleccionado, con quién las realizó.
            PDF vertical, A4.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={descargar} disabled={downloading || isLoading} className="gap-2">
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
        </div>
      </div>

      {downloadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {downloadError}
        </div>
      )}

      {/* Rango de fechas — siempre visible (filtro principal) */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="mt-1 w-40" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="mt-1 w-40" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Presets:</span>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(7)}>7d</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(30)}>30d</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(90)}>90d</Button>
          </div>
        </div>
      </div>

      <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={handleClearFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Estado">
          <Select value={estado || ALL} onValueChange={(v) => setEstado(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {estado ? ESTADO_LABEL[Number(estado)] ?? "—" : "Todos los realizados"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los realizados</SelectItem>
              {Object.entries(ESTADO_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Usuario">
          <Select value={usuarioId || ALL} onValueChange={(v) => setUsuarioId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {usuarioSel ? (usuarioSel.userName ?? usuarioSel.nombre ?? "—") : "Todos los usuarios"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los usuarios</SelectItem>
              {usuarios.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.userName ?? u.email ?? u.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Nivel">
          <Select value={nivelId || ALL} onValueChange={(v) => setNivelId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{nivelSel?.nombre ?? "Todos los niveles"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los niveles</SelectItem>
              {niveles.map((n) => (
                <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Sistema">
          <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {sistemaSel ? `${sistemaSel.codigo} — ${sistemaSel.nombre}` : "Todos los sistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Subsistema">
          <Select value={subSistemaId || ALL} onValueChange={(v) => setSubSistemaId(!v || v === ALL ? "" : v)} disabled={!!sistemaId && subSistemasFiltrados.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {subSistemaSel ? `${subSistemaSel.codigo} — ${subSistemaSel.nombre}` : "Todos los subsistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
              {subSistemasFiltrados.map((ss) => (
                <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Especialidad">
          <Select value={especialidadId || ALL} onValueChange={(v) => setEspecialidadId(!v || v === ALL ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{especialidadSel?.nombre ?? "Todas las especialidades"}</SelectValue>
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
        </FilterField>
      </FiltersSheet>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline-block" />
          <span className="ml-2">Cargando...</span>
        </div>
      ) : preview ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi label="Total realizadas" value={preview.totalRealizadas.toLocaleString("es-AR")} />
            <Kpi label="Promedio por día" value={preview.promedioPorDia.toFixed(1)} />
            <Kpi label="Aprobadas"    value={preview.cantAprobado.toLocaleString("es-AR")}    color="text-green-700" />
            <Kpi label="Firmadas"     value={preview.cantFirmado.toLocaleString("es-AR")}     color="text-emerald-700" />
            <Kpi label="Completadas"  value={preview.cantCompletado.toLocaleString("es-AR")}  color="text-blue-700" />
          </div>

          <p className="text-xs text-muted-foreground">
            Período: <strong>{fmtFecha(preview.fechaDesdeAplicada)}</strong> al <strong>{fmtFecha(preview.fechaHastaAplicada)}</strong>
            {isFetching && !isLoading && <span> · (actualizando...)</span>}
          </p>

          {/* Top usuarios */}
          {preview.topUsuarios.length > 0 && (
            <TopUsuariosCard usuarios={preview.topUsuarios} />
          )}

          {/* Tabla detalle */}
          {preview.tareas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-muted-foreground">
              No hay tareas realizadas en el período seleccionado.
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2 w-32">Fecha</th>
                    <th className="text-left font-semibold px-3 py-2 w-24">TAG</th>
                    <th className="text-left font-semibold px-3 py-2">Elemento · Tarea</th>
                    <th className="text-left font-semibold px-3 py-2 w-32">Subsistema</th>
                    <th className="text-left font-semibold px-3 py-2 w-24">Estado</th>
                    <th className="text-left font-semibold px-3 py-2 w-64">Usuario(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.tareas.map((t) => <TareaRow key={t.elementoTareaId} t={t} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default function TareasRealizadasPage() {
  return (
    <Suspense>
      <TareasRealizadasContent />
    </Suspense>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-0.5 ${color ?? "text-blue-900"}`}>{value}</div>
    </div>
  )
}

function TopUsuariosCard({ usuarios }: { usuarios: TareasRealizadasUsuarioStats[] }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">
        Top usuarios <span className="font-normal text-muted-foreground">· cantidad de tareas completadas</span>
      </h2>
      <ul className="space-y-1">
        {usuarios.map((u, i) => (
          <li key={u.usuarioId} className="flex items-center gap-3 text-sm">
            <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
            <span className="flex-1">{u.usuarioNombre ?? "—"}</span>
            <span className="font-semibold tabular-nums text-blue-900">{u.cantidad.toLocaleString("es-AR")}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TareaRow({ t }: { t: TareaRealizadaItem }) {
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-2 text-[11px] text-gray-700 tabular-nums">{fmtFechaHora(t.fechaFinalizacion)}</td>
      <td className="px-3 py-2 font-mono text-[11px] text-gray-700">{t.elementoTag ?? "—"}</td>
      <td className="px-3 py-2">
        <div className="font-medium">{t.tareaNombre ?? "—"}</div>
        {t.elementoNombre && (
          <div className="text-[10px] text-muted-foreground">{t.elementoNombre}</div>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-gray-600">{t.subSistemaCodigo ?? "—"}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-[10px] ${ESTADO_BADGE[t.estado] ?? "bg-gray-100 text-gray-700"}`}>
          {t.estadoTexto ?? "—"}
        </span>
      </td>
      <td className="px-3 py-2">
        {t.completadorNombre ? (
          <div className="text-[11px] font-medium text-gray-800">{t.completadorNombre}</div>
        ) : (
          <div className="text-[11px] text-muted-foreground">—</div>
        )}
        {t.firmas.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {t.firmas.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-gray-600">
                <PenLine className="h-2.5 w-2.5 text-green-700 shrink-0" />
                <span className="truncate">
                  {f.nombreFirmante ?? "—"}
                  {f.rolFirmante && <span className="text-muted-foreground"> ({f.rolFirmante})</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}
