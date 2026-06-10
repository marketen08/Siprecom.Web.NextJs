"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, Box, Eye, Filter, Loader2, Palette, Settings, Star,
} from "lucide-react"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useGetIfcPrincipal } from "@/features/modelo-3d/api/use-ifc-archivos"
import { resolverEntidadesPorGuids, getGuidsPorElemento } from "@/features/modelo-3d/api/use-ifc-entidades"
import { EntidadDetalleSidebar } from "@/features/modelo-3d/components/entidad-detalle-sidebar"
import { EntidadesPanel } from "@/features/modelo-3d/components/entidades-panel"
import { FiltrosVisorPanel } from "@/features/modelo-3d/components/filtros-visor-panel"
import { LeyendaColoresEstado } from "@/features/modelo-3d/components/leyenda-colores-estado"
import { useFiltroVisor } from "@/features/modelo-3d/hooks/use-filtro-visor"
import { useColoresPorEstadoToggle } from "@/features/modelo-3d/hooks/use-colores-por-estado"
import {
  ApsTranslationStatus,
  EstadoProcesamientoIfc,
  FormatoArchivo3d,
  type ColoresPorEstado,
  type ProyectoIfcArchivo,
  type ProyectoIfcEntidad,
} from "@/features/modelo-3d/types"

interface ViewerHandle {
  highlightByGuid: (guid: string | null) => Promise<void>
  selectByGuids: (guids: string[]) => void
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
  applyColorPorEstado: (buckets: ColoresPorEstado | null) => Promise<void>
  resize: () => void
  dispose: () => void
}

/**
 * Visor 3D full-width del proyecto activo. Carga el IFC principal del proyecto
 * (o el más reciente si no hay principal marcado). Pensado para aprovechar todo
 * el ancho del viewport en desktop — vive en (fullscreen) layout (sin sidebar
 * de navegación).
 */
function ModeloEjecucionContent() {
  const { data: proyectosData } = useGetMisProyectos()
  const proyectoActivo = proyectosData?.find((p) => p.esActivo) ?? null

  const { data: ifcRaw, isLoading: cargandoIfc, error: errorIfc } = useGetIfcPrincipal(proyectoActivo?.id)
  const archivo = ifcRaw?.data ?? null

  // ─── Viewer ────────────────────────────────────────────────────────────────
  // Usamos un callback ref + estado para que el effect de init se dispare
  // *cuando el contenedor realmente se monta en el DOM* — no solo cuando el
  // proyecto está listo. Esto evita una race en hard-reload donde el effect
  // se dispara antes de que el JSX del viewer se haya renderizado (los early
  // returns por loading/empty/etc. impiden que se monte el div).
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    setContainerEl(node)
  }, [])

  const viewerRef = useRef<ViewerHandle | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [loadingView, setLoadingView] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [phase, setPhase] = useState<string>("")
  const [archivoCargadoId, setArchivoCargadoId] = useState<string | null>(null)

  const [entidadSeleccionada, setEntidadSeleccionada] = useState<ProyectoIfcEntidad | null>(null)
  const [resolviendoPick, setResolviendoPick] = useState(false)
  // Toggle del panel de entidades (escondido por default — la página es para "visualizar").
  const [mostrarPanelEntidades, setMostrarPanelEntidades] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const filtroVisor = useFiltroVisor({
    proyectoId: proyectoActivo?.id ?? null,
    archivoId: archivo?.id ?? null,
    archivoCargado: archivoCargadoId !== null && archivoCargadoId === archivo?.id,
    applyGhost: (guids, opts) => viewerRef.current?.applyGhost(guids, opts) ?? Promise.resolve(),
  })

  const coloresEstado = useColoresPorEstadoToggle({
    proyectoId: proyectoActivo?.id ?? null,
    archivoId: archivo?.id ?? null,
    archivoCargado: archivoCargadoId !== null && archivoCargadoId === archivo?.id,
    applyColorPorEstado: (b) => viewerRef.current?.applyColorPorEstado(b) ?? Promise.resolve(),
    // Si hay filtro de Nivel activo, el backend respeta ese filtro al calcular
    // el estado de cada Elemento (cuenta solo las tareas de esos niveles).
    filtro: filtroVisor.filtro,
  })

  const archivoActualIdRef = useRef<string | null>(null)
  archivoActualIdRef.current = archivo?.id ?? null

  const proyectoIdRef = useRef<string | null>(null)
  proyectoIdRef.current = proyectoActivo?.id ?? null

  // Init + carga del viewer — todo en una sola effect. Cuando cambia el archivo
  // disponemos el viewer viejo y montamos uno nuevo del formato correcto.
  // IFC → @thatopen/components; NWD → Autodesk Viewer.
  useEffect(() => {
    if (!proyectoActivo || !archivo || !containerEl) return
    // Esperar a que cada pipeline esté listo según el formato.
    if (archivo.formatoArchivo === FormatoArchivo3d.Ifc
        && archivo.estadoProcesamiento !== EstadoProcesamientoIfc.Completado) return
    if (archivo.formatoArchivo === FormatoArchivo3d.Nwd
        && archivo.apsTranslationStatus !== ApsTranslationStatus.Completado) return

    let cancelled = false
    setViewError(null)
    setLoadingView(true)

    ;(async () => {
      try {
        // Dispose viewer previo.
        viewerRef.current?.dispose()
        viewerRef.current = null
        setViewerReady(false)
        setArchivoCargadoId(null)

        const { createUnifiedViewer } = await import("@/features/modelo-3d/unified-viewer")
        if (cancelled) return
        const handle = await createUnifiedViewer(containerEl, archivo, proyectoActivo.id, {
          onPick: async (guids) => {
            if (guids === null || guids.length === 0) { setEntidadSeleccionada(null); return }
            const archivoActivo = archivoActualIdRef.current
            const proyId = proyectoIdRef.current
            if (!archivoActivo || !proyId) return
            setResolviendoPick(true)
            try {
              // guids viene como cadena hoja→raíz. El backend devuelve las
              // entidades que existen; elegimos la que matchea el guid más
              // profundo (la más cercana a lo clickeado).
              const entidades = await resolverEntidadesPorGuids(proyId, archivoActivo, guids)
              const porGuid = new Map(entidades.map((e) => [e.ifcGuid, e]))
              const elegida = guids.map((g) => porGuid.get(g)).find(Boolean) ?? null
              setEntidadSeleccionada(elegida)

              // Si la entidad está vinculada a un Elemento, seleccionamos en el
              // visor TODAS las piezas de ese Elemento (toda la línea/equipo), no
              // solo la hoja clickeada.
              if (elegida?.elementoId) {
                const guidsElemento = await getGuidsPorElemento(proyId, archivoActivo, elegida.elementoId)
                if (guidsElemento.length > 0) viewerRef.current?.selectByGuids(guidsElemento)
              }
            } catch (e) {
              setViewError((e as Error).message)
            } finally {
              setResolviendoPick(false)
            }
          },
          onProgress: (msg) => { if (!cancelled) setPhase(msg) },
        })
        if (cancelled) { handle.dispose(); return }
        viewerRef.current = handle
        setViewerReady(true)
        setArchivoCargadoId(archivo.id)
      } catch (e) {
        if (!cancelled) {
          setViewError((e as Error).message)
          setPhase("")
        }
      } finally {
        if (!cancelled) setLoadingView(false)
      }
    })()

    return () => {
      cancelled = true
      viewerRef.current?.dispose()
      viewerRef.current = null
      setViewerReady(false)
      setArchivoCargadoId(null)
    }
  }, [
    proyectoActivo?.id, containerEl, archivo?.id, archivo?.formatoArchivo,
    archivo?.estadoProcesamiento, archivo?.apsTranslationStatus,
  ])

  // ResizeObserver: cuando el contenedor del viewer cambia de tamaño (por
  // ejemplo si se abre/cierra el panel de filtros o algún sidebar), notificamos
  // al viewer para que recalcule su viewport. Sin esto el click queda
  // desfasado en el eje X — el cursor aparenta apuntar a un objeto pero el
  // raycast cae sobre otro que está a X píxeles a la derecha (= ancho del
  // panel que apareció).
  useEffect(() => {
    if (!containerEl) return
    const ro = new ResizeObserver(() => {
      viewerRef.current?.resize?.()
    })
    ro.observe(containerEl)
    return () => ro.disconnect()
  }, [containerEl])

  async function seleccionarEntidadDesdeListado(entidad: ProyectoIfcEntidad) {
    setEntidadSeleccionada(entidad)
    await viewerRef.current?.highlightByGuid(entidad.ifcGuid)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!proyectoActivo) {
    return (
      <EmptyState
        icon={<Box className="h-12 w-12 text-gray-300" />}
        title="No tenés proyecto activo"
        description="Elegí un proyecto desde el menú de proyectos del navbar para ver su modelo 3D."
      />
    )
  }

  if (errorIfc) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12 text-red-300" />}
        title="No se pudo cargar el modelo"
        description={(errorIfc as Error).message}
      />
    )
  }

  if (cargandoIfc) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Buscando IFC del proyecto…
      </div>
    )
  }

  if (!archivo) {
    return (
      <EmptyState
        icon={<Box className="h-12 w-12 text-gray-300" />}
        title="Este proyecto no tiene IFC cargado"
        description="Subí un archivo IFC desde la configuración del proyecto para verlo acá."
        cta={
          <Link
            href={`/alcance/proyectos/${proyectoActivo.id}/modelo-3d`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Settings className="h-4 w-4" /> Gestionar IFCs del proyecto
          </Link>
        }
      />
    )
  }

  // Si el archivo principal todavía se está procesando (xbim para IFC, APS
  // Model Derivative para NWD), mostramos progreso.
  const procesandoIfc = archivo.formatoArchivo === FormatoArchivo3d.Ifc
    && archivo.estadoProcesamiento !== EstadoProcesamientoIfc.Completado
  const procesandoAps = archivo.formatoArchivo === FormatoArchivo3d.Nwd
    && archivo.apsTranslationStatus !== ApsTranslationStatus.Completado
  const enError = (archivo.formatoArchivo === FormatoArchivo3d.Ifc
        && archivo.estadoProcesamiento === EstadoProcesamientoIfc.Error)
    || (archivo.formatoArchivo === FormatoArchivo3d.Nwd
        && archivo.apsTranslationStatus === ApsTranslationStatus.Error)

  if (procesandoIfc || procesandoAps) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full rounded-lg border border-blue-200 bg-blue-50 p-6 text-center space-y-3">
          <div className="flex items-center justify-center">
            {enError
              ? <AlertTriangle className="h-10 w-10 text-red-500" />
              : <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />}
          </div>
          <h2 className="text-base font-semibold text-gray-800">{archivo.nombre}</h2>
          {enError ? (
            <p className="text-sm text-red-700">
              {archivo.errorProcesamiento ?? archivo.apsTranslationError ?? "El procesamiento falló."}
            </p>
          ) : archivo.formatoArchivo === FormatoArchivo3d.Nwd ? (
            <p className="text-sm text-blue-700">
              Traduciendo NWD a SVF2 con Autodesk
              {archivo.apsTranslationProgress != null && ` (${archivo.apsTranslationProgress}%)`} —
              puede tardar varios minutos. La página se actualiza sola cuando termina.
            </p>
          ) : (
            <p className="text-sm text-blue-700">
              {archivo.esArchivoBootstrap
                ? "Creando proyecto desde IFC — la página se actualiza sola cuando termina."
                : "Procesando entidades con xbim — la página se actualiza sola cuando termina."}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header slim con título + acciones */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Box className="h-4 w-4 text-blue-600 shrink-0" />
          <h1 className="text-sm font-semibold text-gray-800 truncate">
            {proyectoActivo.nombre}
          </h1>
          <span className="text-xs text-gray-400 shrink-0">·</span>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {archivo.esPrincipal && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
            {archivo.nombre}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              mostrarFiltros || filtroVisor.activo
                ? "text-blue-700 bg-blue-50 border-blue-200"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {filtroVisor.activo && filtroVisor.resultado && (
              <span className="ml-1 rounded-full bg-blue-600 text-white px-1.5 text-[10px] font-bold">
                {filtroVisor.resultado.totalCoinciden}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => coloresEstado.setActivo((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              coloresEstado.activo
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            title="Pintar entidades con color según el estado del Elemento"
          >
            <Palette className="h-3.5 w-3.5" />
            Colores por estado
          </button>
          <button
            type="button"
            onClick={() => setMostrarPanelEntidades((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              mostrarPanelEntidades ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {mostrarPanelEntidades ? "Ocultar entidades" : "Ver entidades"}
          </button>
          <Link
            href={`/alcance/proyectos/${proyectoActivo.id}/modelo-3d`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Gestionar Modelo 3D
          </Link>
        </div>
      </div>

      {/* Indicadores de fase / error sobre el visor */}
      {viewError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700">
          {viewError}
        </div>
      )}
      {(loadingView || phase) && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-1.5 text-xs text-blue-700 flex items-center gap-2">
          {loadingView && <Loader2 className="h-3 w-3 animate-spin" />}
          {phase}
        </div>
      )}

      {/* Cuerpo: panel de filtros (izquierda) + viewer + sidebar de detalle (derecha) */}
      <div className="flex-1 flex min-h-0 gap-3 p-3">
        {mostrarFiltros && (
          <FiltrosVisorPanel
            filtro={filtroVisor.filtro}
            onChange={filtroVisor.setFiltro}
            totalCoinciden={filtroVisor.resultado?.totalCoinciden ?? null}
            totalEntidades={filtroVisor.resultado?.totalEntidades ?? null}
            loading={filtroVisor.loading}
            onClose={() => setMostrarFiltros(false)}
          />
        )}
        <div className="relative flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div ref={setContainerRef} className="absolute inset-0" />
          {coloresEstado.activo && (
            <div className="absolute top-3 left-3 z-10">
              <LeyendaColoresEstado buckets={coloresEstado.buckets} loading={coloresEstado.loading} />
            </div>
          )}
          {actualHintVisible(viewerReady, archivoCargadoId, entidadSeleccionada, resolviendoPick) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none rounded-full bg-black/70 text-white text-xs px-3 py-1">
              Click sobre una entidad para ver su Elemento vinculado
            </div>
          )}
          {resolviendoPick && (
            <div className="absolute top-3 right-3 rounded-md bg-white/95 border border-gray-200 px-2 py-1 text-xs text-gray-700 flex items-center gap-1.5 shadow-sm">
              <Loader2 className="h-3 w-3 animate-spin" /> Resolviendo…
            </div>
          )}
        </div>

        {entidadSeleccionada && (
          <EntidadDetalleSidebar
            proyectoId={proyectoActivo.id}
            entidad={entidadSeleccionada}
            onClose={async () => {
              setEntidadSeleccionada(null)
              await viewerRef.current?.highlightByGuid(null)
            }}
          />
        )}
      </div>

      {/* Panel de entidades plegable (escondido por default — se abre con el botón) */}
      {mostrarPanelEntidades && (
        <div className="border-t border-gray-200 bg-white p-4 max-h-[40vh] overflow-y-auto">
          <EntidadesPanel
            proyectoId={proyectoActivo.id}
            archivoId={archivo.id}
            onSeleccionar={seleccionarEntidadDesdeListado}
            entidadSeleccionadaId={entidadSeleccionada?.id ?? null}
            filtroVisor={filtroVisor.filtro}
          />
        </div>
      )}
    </div>
  )
}

function actualHintVisible(
  viewerReady: boolean,
  archivoCargadoId: string | null,
  entidadSeleccionada: unknown,
  resolviendoPick: boolean,
) {
  return viewerReady && archivoCargadoId && !entidadSeleccionada && !resolviendoPick
}

function EmptyState({
  icon, title, description, cta,
}: {
  icon: React.ReactNode
  title: string
  description: string
  cta?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 min-h-[calc(100vh-4rem)] gap-3">
      {icon}
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {cta}
    </div>
  )
}

export default function ModeloEjecucionPage() {
  return (
    <Suspense>
      <ModeloEjecucionContent />
    </Suspense>
  )
}
