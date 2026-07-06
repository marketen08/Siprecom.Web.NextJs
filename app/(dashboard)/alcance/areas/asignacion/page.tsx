"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, MapPin, Search } from "lucide-react"

import { useGetAreas } from "@/features/areas/api/use-get-areas"
import { useGetElementosAsignadosArea, type ElementoAsignable } from "@/features/areas/api/use-get-elementos-asignados-area"
import { useGetElementosDisponiblesArea } from "@/features/areas/api/use-get-elementos-disponibles-area"
import { fetchElementosDisponiblesIdsArea } from "@/features/areas/api/use-get-elementos-disponibles-ids-area"
import { fetchElementosAsignadosIdsArea } from "@/features/areas/api/use-get-elementos-asignados-ids-area"
import { useAsignarElementosArea } from "@/features/areas/api/use-asignar-elementos-area"
import { useDesasignarElementosArea } from "@/features/areas/api/use-desasignar-elementos-area"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposUsados } from "@/features/elementostipos/api/use-get-elementostipos-usados"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const SUB_ALL = "__all__"
const TIPO_ELEM_ALL = "__all__"
const ESP_ALL = "__all__"

interface ListaProps {
  titulo: string
  vacio: string
  items: ElementoAsignable[]
  selected: Set<string>
  onToggle: (id: string) => void
  /** Reemplaza el set completo — usado para "seleccionar todo" / "deseleccionar todo". */
  onReplace: (ids: Set<string>) => void
  isLoading: boolean
  right?: React.ReactNode
  /** Paginación opcional. Cuando total > pageSize, se muestran controles al pie. */
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (p: number) => void
  /**
   * Callback para "seleccionar todos los N que coinciden con los filtros" cross-page.
   * Devuelve los IDs matched — la lista los agrega al `selected`. Cuando está seteado
   * y hay paginación, aparece un banner después de marcar el checkbox del header.
   */
  onSelectAllMatched?: () => Promise<string[]>
}

function ListaElementos({
  titulo, vacio, items, selected, onToggle, onReplace, isLoading, right,
  page, pageSize, total, onPageChange, onSelectAllMatched,
}: ListaProps) {
  const [cargandoMatched, setCargandoMatched] = useState(false)
  const [expandidoMatched, setExpandidoMatched] = useState(false)
  const seleccionadosVisibles = items.reduce((acc, x) => acc + (selected.has(x.id) ? 1 : 0), 0)
  const hayItems = items.length > 0
  const todosSeleccionados = hayItems && seleccionadosVisibles === items.length
  const algunosSeleccionados = seleccionadosVisibles > 0 && !todosSeleccionados

  // Total efectivo: si hay paginación, `total` viene del backend; sino usamos `items.length`.
  const totalDisplay = total ?? items.length
  const totalPages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const hayPaginacion = totalPages > 1 && page && onPageChange
  // Cuando hay paginación, `selected.size` puede incluir ítems de otras páginas.
  const seleccionadosTotales = selected.size

  function toggleAll() {
    setExpandidoMatched(false)
    if (todosSeleccionados) {
      const visiblesIds = new Set(items.map((x) => x.id))
      const next = new Set<string>()
      for (const id of selected) if (!visiblesIds.has(id)) next.add(id)
      onReplace(next)
    } else {
      const next = new Set(selected)
      for (const x of items) next.add(x.id)
      onReplace(next)
    }
  }

  async function seleccionarMatched() {
    if (!onSelectAllMatched) return
    setCargandoMatched(true)
    try {
      const ids = await onSelectAllMatched()
      const next = new Set(selected)
      for (const id of ids) next.add(id)
      onReplace(next)
      setExpandidoMatched(true)
    } finally {
      setCargandoMatched(false)
    }
  }

  // Banner "seleccionar todos matched": aparece cuando marcaste todos los visibles y
  // todavía hay más en otras páginas. Se oculta si deseleccionás o cambiás de página.
  const mostrarBannerExpandir =
    hayPaginacion && !!onSelectAllMatched && todosSeleccionados
    && !expandidoMatched && totalDisplay > seleccionadosTotales

  return (
    <div className="flex flex-col rounded-lg border bg-card min-h-125">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <label className={`flex items-center gap-2 ${hayItems ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
          <input
            type="checkbox"
            checked={todosSeleccionados}
            disabled={!hayItems}
            onChange={toggleAll}
            ref={(el) => { if (el) el.indeterminate = algunosSeleccionados }}
            className="h-4 w-4 accent-blue-900"
            aria-label={todosSeleccionados ? "Deseleccionar todo" : "Seleccionar todo"}
          />
          <h3 className="font-semibold text-sm">{titulo}</h3>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {hayPaginacion
              ? (seleccionadosTotales > 0
                  ? `${seleccionadosTotales} sel · ${totalDisplay}`
                  : `${items.length} de ${totalDisplay}`)
              : (seleccionadosVisibles > 0 ? `${seleccionadosVisibles}/${totalDisplay}` : totalDisplay)}
          </span>
          {right}
        </div>
      </div>
      {mostrarBannerExpandir && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-900 flex items-center gap-2 flex-wrap">
          <span>
            Se seleccionaron los <strong>{seleccionadosVisibles}</strong> de esta página.
          </span>
          <button
            className="text-blue-700 font-medium hover:underline disabled:opacity-50"
            onClick={seleccionarMatched}
            disabled={cargandoMatched}
          >
            {cargandoMatched
              ? "Cargando..."
              : `Seleccionar los ${totalDisplay} que coinciden con los filtros`}
          </button>
        </div>
      )}
      {expandidoMatched && seleccionadosTotales > items.length && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-900">
          Se seleccionaron los <strong>{seleccionadosTotales}</strong> que coinciden con los filtros.
        </div>
      )}
      <div className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1 ${hayPaginacion ? "max-h-110" : "max-h-125"}`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-3">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3">{vacio}</p>
        ) : (
          items.map((el) => (
            <label
              key={el.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-muted text-sm ${
                selected.has(el.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(el.id)}
                onChange={() => onToggle(el.id)}
                className="h-4 w-4 accent-blue-900"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{el.tag}</span>
                  {el.elementoTipoNombre && (
                    <Badge variant="outline" className="text-[10px]">{el.elementoTipoNombre}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {el.nombre}
                  {el.subSistemaCodigo && ` · ${el.subSistemaCodigo}`}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
      {hayPaginacion && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onPageChange!(Math.max(1, page! - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onPageChange!(page! + 1)}
              disabled={page! >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AsignacionAreasPage() {
  const [areaId, setAreaId] = useState<string | null>(null)
  const [subFilter, setSubFilter] = useState<string>(SUB_ALL)
  const [espFilter, setEspFilter] = useState<string>(ESP_ALL)
  const [tipoElemFilter, setTipoElemFilter] = useState<string>(TIPO_ELEM_ALL)
  const [search, setSearch] = useState("")

  const [selectedDisp, setSelectedDisp] = useState<Set<string>>(new Set())
  const [selectedAsig, setSelectedAsig] = useState<Set<string>>(new Set())

  // Paginación por lista (independiente). Los seleccionados sobreviven al cambio de
  // página porque los Sets viven fuera del render de la lista — podés marcar en pág 1,
  // saltar a pág 3, marcar más, volver a pág 1 y todo sigue seleccionado.
  const [pageDisp, setPageDisp] = useState(1)
  const [pageAsig, setPageAsig] = useState(1)
  const pageSize = 50

  // Reset de página al cambiar de área o cualquier filtro — sino podés quedar en pág 5
  // con 2 páginas totales viendo lista vacía sin entender por qué.
  useEffect(() => {
    setPageDisp(1)
    setPageAsig(1)
  }, [areaId, subFilter, espFilter, tipoElemFilter, search])

  const { data: areasData } = useGetAreas()
  const areas = areasData?.data ?? []

  const { data: subsData } = useGetSubSistemasSelect()
  const subs = subsData?.data ?? []
  const { data: tiposData } = useGetElementosTiposUsados()
  const tiposElem = (tiposData as any)?.data ?? []
  const { data: espData } = useGetEspecialidadesUsadas()
  const especialidades = espData?.data ?? []

  const tiposElemFiltrados = useMemo(() => {
    if (espFilter === ESP_ALL) return tiposElem
    return (tiposElem as Array<{ id: string; nombre: string; especialidadId?: string }>)
      .filter((t) => t.especialidadId === espFilter)
  }, [tiposElem, espFilter])

  // Ambos hooks reciben los MISMOS filtros — así ver la asignación es simétrico:
  // el filtro "Subsistema X" acota disponibles y asignados al mismo alcance.
  const filtrosComunes = {
    subSistemaId: subFilter === SUB_ALL ? undefined : subFilter,
    elementoTipoId: tipoElemFilter === TIPO_ELEM_ALL ? undefined : tipoElemFilter,
    especialidadId: espFilter === ESP_ALL ? undefined : espFilter,
    search: search || undefined,
  }

  const { data: asignadosData, isLoading: loadingAsignados } = useGetElementosAsignadosArea({
    areaId,
    ...filtrosComunes,
    page: pageAsig,
    pageSize,
  })
  const { data: dispData, isLoading: loadingDisp } = useGetElementosDisponiblesArea({
    areaId,
    ...filtrosComunes,
    page: pageDisp,
    pageSize,
  })

  const asignados = asignadosData?.data?.data ?? []
  const asignadosTotal = asignadosData?.data?.total ?? 0
  const disponibles = dispData?.data?.data ?? []
  const disponiblesTotal = dispData?.data?.total ?? 0

  const asignarMutation = useAsignarElementosArea()
  const desasignarMutation = useDesasignarElementosArea()

  const areaActual = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId])

  const toggleDisp = (id: string) => {
    setSelectedDisp((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAsig = (id: string) => {
    setSelectedAsig((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAsignar = async () => {
    if (!areaId || selectedDisp.size === 0) return
    await asignarMutation.mutateAsync({
      areaId,
      elementoIds: Array.from(selectedDisp),
    })
    setSelectedDisp(new Set())
  }

  const handleDesasignar = async () => {
    if (!areaId || selectedAsig.size === 0) return
    // Bulk en 1 llamada — antes iterábamos con N HTTP round-trips (10k tomaba minutos).
    await desasignarMutation.mutateAsync({
      areaId,
      elementoIds: Array.from(selectedAsig),
    })
    setSelectedAsig(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header con selector de Área */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <MapPin className="h-4 w-4 text-blue-700 shrink-0" />

          <Select
            value={areaId ?? ""}
            onValueChange={(v) => {
              setAreaId(v || null)
              setSelectedDisp(new Set())
              setSelectedAsig(new Set())
            }}
          >
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Elegí un área">
                {(() => {
                  const a = areas.find((x) => x.id === areaId)
                  return a
                    ? `${a.codigo} — ${a.nombre}`
                    : "Elegí un área"
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {areas.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin áreas definidas. Creá una en Alcance → Áreas.
                </div>
              )}
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.codigo} — {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {areaActual && areaActual.descripcion && (
            <Badge variant="outline" className="ml-auto max-w-sm truncate">
              {areaActual.descripcion}
            </Badge>
          )}
        </div>
      </div>

      {!areaId ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Elegí un área para empezar a asignar elementos.
        </div>
      ) : (
        <>
          {/* Filtros de la lista de disponibles */}
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar TAG, nombre, PID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={subFilter} onValueChange={(v) => setSubFilter(v ?? SUB_ALL)}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Todos los subsistemas">
                  {(() => {
                    if (subFilter === SUB_ALL) return "Todos los subsistemas"
                    const s = subs.find((x) => x.id === subFilter)
                    return s ? `${s.codigo} — ${s.nombre}` : "Todos los subsistemas"
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SUB_ALL}>Todos los subsistemas</SelectItem>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={espFilter}
              onValueChange={(v) => {
                const value = v ?? ESP_ALL
                setEspFilter(value)
                // Si el tipo seleccionado dejó de pertenecer a la nueva especialidad, lo limpio.
                if (value !== ESP_ALL && tipoElemFilter !== TIPO_ELEM_ALL) {
                  const t = tiposElem.find((x: any) => x.id === tipoElemFilter)
                  if (t?.especialidadId !== value) setTipoElemFilter(TIPO_ELEM_ALL)
                }
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todas las especialidades">
                  {(() => {
                    if (espFilter === ESP_ALL) return "Todas las especialidades"
                    const e = especialidades.find((x) => x.id === espFilter)
                    return e ? (e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre) : "Todas las especialidades"
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ESP_ALL}>Todas las especialidades</SelectItem>
                {especialidades.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipoElemFilter} onValueChange={(v) => setTipoElemFilter(v ?? TIPO_ELEM_ALL)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos los tipos de elemento">
                  {(() => {
                    if (tipoElemFilter === TIPO_ELEM_ALL) return "Todos los tipos de elemento"
                    const t = tiposElem.find((x: any) => x.id === tipoElemFilter)
                    return t ? t.nombre : "Todos los tipos de elemento"
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPO_ELEM_ALL}>Todos los tipos de elemento</SelectItem>
                {tiposElemFiltrados.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dos columnas + botones */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
            <ListaElementos
              titulo="Disponibles"
              vacio="Sin elementos que cumplan los filtros."
              items={disponibles}
              selected={selectedDisp}
              onToggle={toggleDisp}
              onReplace={setSelectedDisp}
              isLoading={loadingDisp}
              page={pageDisp}
              pageSize={pageSize}
              total={disponiblesTotal}
              onPageChange={setPageDisp}
              onSelectAllMatched={
                areaId
                  ? () => fetchElementosDisponiblesIdsArea({ areaId, ...filtrosComunes })
                  : undefined
              }
            />

            <div className="flex md:flex-col items-center justify-center gap-3">
              <Button
                onClick={handleAsignar}
                disabled={selectedDisp.size === 0 || asignarMutation.isPending}
                className="gap-2 bg-blue-900 hover:bg-blue-800"
                size="sm"
              >
                <ArrowRight className="h-4 w-4" />
                Asignar {selectedDisp.size > 0 ? `(${selectedDisp.size})` : ""}
              </Button>
              <Button
                variant="outline"
                onClick={handleDesasignar}
                disabled={selectedAsig.size === 0 || desasignarMutation.isPending}
                className="gap-2"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Quitar {selectedAsig.size > 0 ? `(${selectedAsig.size})` : ""}
              </Button>
            </div>

            <ListaElementos
              titulo="Asignados al área"
              vacio="Todavía no hay elementos asignados."
              items={asignados}
              selected={selectedAsig}
              onToggle={toggleAsig}
              onReplace={setSelectedAsig}
              isLoading={loadingAsignados}
              page={pageAsig}
              pageSize={pageSize}
              total={asignadosTotal}
              onPageChange={setPageAsig}
              onSelectAllMatched={
                areaId
                  ? () => fetchElementosAsignadosIdsArea({ areaId, ...filtrosComunes })
                  : undefined
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
