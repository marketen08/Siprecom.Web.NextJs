"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"

import { useGetTestGroups } from "@/features/testgroups/api/use-get-testgroups"
import { useGetElementosAsignados, type ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"
import { useGetElementosDisponibles } from "@/features/testgroups/api/use-get-elementos-disponibles"
import { fetchElementosDisponiblesIds } from "@/features/testgroups/api/use-get-elementos-disponibles-ids"
import { fetchElementosAsignadosIds } from "@/features/testgroups/api/use-get-elementos-asignados-ids"
import { useAsignarElementos } from "@/features/testgroups/api/use-asignar-elementos"
import { useDesasignarElementos } from "@/features/testgroups/api/use-desasignar-elementos"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useGetElementosTiposUsados } from "@/features/elementostipos/api/use-get-elementostipos-usados"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"
import { ESTADO_TEST_GROUP, TIPO_TEST_GROUP, type EstadoTestGroup, type TipoTestGroup } from "@/features/testgroups/types"

// La asignación solo tiene sentido sobre packs "en juego" (BORRADOR o ACTIVO).
// COMPLETADO y CERRADO no aceptan cambios de composición.
const ESTADOS_ASIGNABLES: EstadoTestGroup[] = [
  ESTADO_TEST_GROUP.BORRADOR,
  ESTADO_TEST_GROUP.ACTIVO,
]

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TIPO_ALL = "__all__"
const SUB_ALL = "__all__"
const TIPO_ELEM_ALL = "__all__"
const ESP_ALL = "__all__"

interface ListaProps {
  titulo: string
  vacio: string
  items: ElementoAsignable[]
  selected: Set<string>
  onToggle: (id: string) => void
  /**
   * Reemplaza `selected` con `ids`. La página lo usa para "seleccionar todo"
   * (pasando los ids de todos los items visibles) o "deseleccionar todo"
   * (pasando un Set vacío).
   */
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
  // Contamos cuántos de los ítems visibles están seleccionados. En el modelo,
  // `selected` puede tener ids de una carga previa (ej. antes de aplicar un filtro)
  // por eso comparamos contra `items` (los visibles ahora).
  const seleccionadosVisibles = items.reduce((acc, x) => acc + (selected.has(x.id) ? 1 : 0), 0)
  const hayItems = items.length > 0
  const todosSeleccionados = hayItems && seleccionadosVisibles === items.length
  const algunosSeleccionados = seleccionadosVisibles > 0 && !todosSeleccionados

  // Total efectivo: si hay paginación, `total` viene del backend; sino usamos `items.length`.
  const totalDisplay = total ?? items.length
  const totalPages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const hayPaginacion = totalPages > 1 && page && onPageChange
  const seleccionadosTotales = selected.size

  function toggleAll() {
    setExpandidoMatched(false)
    if (todosSeleccionados) {
      // Quitar del set solo los visibles (preservar cualquier selección "invisible").
      const visiblesIds = new Set(items.map((x) => x.id))
      const next = new Set<string>()
      for (const id of selected) if (!visiblesIds.has(id)) next.add(id)
      onReplace(next)
    } else {
      // Sumar los visibles al set.
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
      <div className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1 ${hayPaginacion ? "max-h-115" : "max-h-125"}`}>
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

export default function AsignacionPage() {
  // useSearchParams necesita Suspense para no romper el static rendering.
  return (
    <Suspense>
      <AsignacionPageContent />
    </Suspense>
  )
}

function AsignacionPageContent() {
  // Pre-selección desde la URL — se dispara desde el dropdown de acciones en
  // /alcance/test-groups. Solo aplica en el mount inicial; después el user
  // puede cambiarlo normalmente desde el Select.
  const searchParams = useSearchParams()
  const testGroupIdFromUrl = searchParams.get("testGroupId")

  const [tipoFilter, setTipoFilter] = useState<string>(TIPO_ALL)
  const [testGroupId, setTestGroupId] = useState<string | null>(testGroupIdFromUrl)
  const [subFilter, setSubFilter] = useState<string>(SUB_ALL)
  const [especialidadFilter, setEspecialidadFilter] = useState<string>(ESP_ALL)
  const [tipoElemFilter, setTipoElemFilter] = useState<string>(TIPO_ELEM_ALL)
  const [search, setSearch] = useState("")

  const [selectedDisp, setSelectedDisp] = useState<Set<string>>(new Set())
  const [selectedAsig, setSelectedAsig] = useState<Set<string>>(new Set())

  // Paginación por lista (independiente). Los seleccionados sobreviven al cambio de
  // página porque los Sets viven fuera del render de la lista.
  const [pageDisp, setPageDisp] = useState(1)
  const [pageAsig, setPageAsig] = useState(1)
  const pageSize = 50

  // Reset al cambiar de pack o cualquier filtro — sino quedás en pág 5 sin resultados.
  useEffect(() => {
    setPageDisp(1)
    setPageAsig(1)
  }, [testGroupId, subFilter, especialidadFilter, tipoElemFilter, search])

  // Si el usuario navega de vuelta a esta página con otro testGroupId en la URL
  // (ej. abrió el dropdown de acciones de otro pack), sincronizamos el state.
  useEffect(() => {
    if (testGroupIdFromUrl && testGroupIdFromUrl !== testGroupId) {
      setTestGroupId(testGroupIdFromUrl)
      setSelectedDisp(new Set())
      setSelectedAsig(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testGroupIdFromUrl])

  const tipoParam: TipoTestGroup | undefined =
    tipoFilter === TIPO_ALL ? undefined : (parseInt(tipoFilter, 10) as TipoTestGroup)

  const { data: tgData } = useGetTestGroups({ tipo: tipoParam, estados: ESTADOS_ASIGNABLES })
  const testGroups = tgData?.data ?? []

  const { data: subsData } = useGetSubSistemasSelect()
  const subs = subsData?.data ?? []

  // Flag efectivo del proyecto: si TestGroups multi-subsistema está apagado (OPERCOM),
  // ocultamos el select de subsistema del filtro. El backend igual restringe a los
  // elementos del subsistema del pack — el filtro sería puramente confuso.
  const { data: proyectos } = useGetMisProyectos()
  const proyectoActivo = proyectos?.find((p) => p.esActivo)
  const permiteMultiSubsistema = proyectoActivo?.testGroupsMultiSubsistema ?? false
  // Usamos las variantes "usadas/usados" — solo especialidades y tipos con al
  // menos un Elemento en el proyecto activo. Evita ofrecer opciones que darían
  // lista vacía al filtrar.
  const { data: tiposData } = useGetElementosTiposUsados()
  const tiposElem = (tiposData as any)?.data ?? []
  const { data: espData } = useGetEspecialidadesUsadas()
  const especialidades = espData?.data ?? []

  // Al cambiar la especialidad, si el tipo elegido no pertenece a esa especialidad, lo reseteo.
  const tiposElemFiltrados = useMemo(() => {
    if (especialidadFilter === ESP_ALL) return tiposElem
    return (tiposElem as Array<{ id: string; nombre: string; especialidadId?: string }>)
      .filter((t) => t.especialidadId === especialidadFilter)
  }, [tiposElem, especialidadFilter])

  // Ambos hooks reciben los MISMOS filtros — así ver la asignación es simétrico:
  // el filtro "Subsistema X" acota disponibles y asignados al mismo alcance.
  const filtrosComunes = {
    subSistemaId: subFilter === SUB_ALL ? undefined : subFilter,
    elementoTipoId: tipoElemFilter === TIPO_ELEM_ALL ? undefined : tipoElemFilter,
    especialidadId: especialidadFilter === ESP_ALL ? undefined : especialidadFilter,
    search: search || undefined,
  }

  const { data: asignadosData, isLoading: loadingAsignados } = useGetElementosAsignados({
    testGroupId,
    ...filtrosComunes,
    page: pageAsig,
    pageSize,
  })
  const { data: dispData, isLoading: loadingDisp } = useGetElementosDisponibles({
    testGroupId,
    ...filtrosComunes,
    page: pageDisp,
    pageSize,
  })

  const asignados = asignadosData?.data?.data ?? []
  const asignadosTotal = asignadosData?.data?.total ?? 0
  const disponibles = dispData?.data?.data ?? []
  const disponiblesTotal = dispData?.data?.total ?? 0

  const asignarMutation = useAsignarElementos()
  const desasignarMutation = useDesasignarElementos()

  const tgActual = useMemo(() => testGroups.find((t) => t.id === testGroupId), [testGroups, testGroupId])

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
    if (!testGroupId || selectedDisp.size === 0) return
    await asignarMutation.mutateAsync({
      testGroupId,
      elementoIds: Array.from(selectedDisp),
    })
    setSelectedDisp(new Set())
  }

  const handleDesasignar = async () => {
    if (!testGroupId || selectedAsig.size === 0) return
    // Bulk en 1 llamada — antes iterábamos con N HTTP round-trips (10k tomaba minutos).
    await desasignarMutation.mutateAsync({
      testGroupId,
      elementoIds: Array.from(selectedAsig),
    })
    setSelectedAsig(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header con selectores de TestGroup */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v ?? TIPO_ALL); setTestGroupId(null) }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos los tipos">
                {tipoFilter === TIPO_ALL
                  ? "Todos los tipos"
                  : tipoFilter === String(TIPO_TEST_GROUP.PRESSURE)
                    ? "Pressure Test Pack"
                    : "Basic Function"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_ALL}>Todos los tipos</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.PRESSURE)}>Pressure Test Pack</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.BASIC_FUNCTION)}>Basic Function</SelectItem>
            </SelectContent>
          </Select>

          <Select value={testGroupId ?? ""} onValueChange={(v) => { setTestGroupId(v || null); setSelectedDisp(new Set()); setSelectedAsig(new Set()) }}>
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Elegí un paquete de prueba">
                {(() => {
                  const tg = testGroups.find((x) => x.id === testGroupId)
                  return tg
                    ? `${tg.codigo} — ${tg.nombre || "(sin nombre)"} [${tg.tipoTexto}]`
                    : "Elegí un paquete de prueba"
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {testGroups.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin paquetes para este filtro.</div>
              )}
              {testGroups.map((tg) => (
                <SelectItem key={tg.id} value={tg.id}>
                  {tg.codigo} — {tg.nombre || "(sin nombre)"} [{tg.tipoTexto}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tgActual && (
            <Badge variant="outline" className="ml-auto">
              {tgActual.subSistemaCodigo ?? "—"} · {tgActual.estadoTexto}
            </Badge>
          )}
        </div>
        {tgActual && !permiteMultiSubsistema && (
          <p className="text-xs text-muted-foreground">
            Este proyecto restringe los paquetes a un único subsistema (OPERCOM).
            Solo se muestran los elementos del subsistema <strong>{tgActual.subSistemaCodigo ?? "—"}</strong>.
            Habilitá "TestGroups multi-subsistema" en las funcionalidades del proyecto para permitir cross-subsistema.
          </p>
        )}
      </div>

      {!testGroupId ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Elegí un paquete de prueba para empezar a asignar elementos.
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
            {permiteMultiSubsistema && (
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
            )}

            <Select
              value={especialidadFilter}
              onValueChange={(v) => {
                const value = v ?? ESP_ALL
                setEspecialidadFilter(value)
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
                    if (especialidadFilter === ESP_ALL) return "Todas las especialidades"
                    const e = especialidades.find((x) => x.id === especialidadFilter)
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
              titulo="Disponibles (agrupables)"
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
                testGroupId
                  ? () => fetchElementosDisponiblesIds({ testGroupId, ...filtrosComunes })
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
              titulo="Asignados al paquete"
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
                testGroupId
                  ? () => fetchElementosAsignadosIds({ testGroupId, ...filtrosComunes })
                  : undefined
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
