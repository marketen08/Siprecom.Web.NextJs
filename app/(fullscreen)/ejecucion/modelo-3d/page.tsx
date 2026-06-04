"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, Box, Eye, Loader2, Settings, Star,
} from "lucide-react"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import {
  downloadIfcBuffer,
  useGetIfcPrincipal,
} from "@/features/modelo-3d/api/use-ifc-archivos"
import { resolverEntidadesPorGuids } from "@/features/modelo-3d/api/use-ifc-entidades"
import { EntidadDetalleSidebar } from "@/features/modelo-3d/components/entidad-detalle-sidebar"
import { EntidadesPanel } from "@/features/modelo-3d/components/entidades-panel"
import {
  EstadoProcesamientoIfc,
  type ProyectoIfcArchivo,
  type ProyectoIfcEntidad,
} from "@/features/modelo-3d/types"

interface ViewerHandle {
  loadIfc: (buffer: Uint8Array, name?: string) => Promise<{ totalItems: number }>
  highlightByGuid: (guid: string | null) => Promise<void>
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
  const containerRef = useRef<HTMLDivElement>(null)
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

  const archivoActualIdRef = useRef<string | null>(null)
  archivoActualIdRef.current = archivo?.id ?? null

  const proyectoIdRef = useRef<string | null>(null)
  proyectoIdRef.current = proyectoActivo?.id ?? null

  // Init del viewer (una sola vez por proyecto).
  useEffect(() => {
    if (!proyectoActivo) return
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    ;(async () => {
      const { createViewer } = await import("@/features/modelo-3d/viewer")
      if (cancelled) return
      const handle = await createViewer(container, {
        onPick: async (guid) => {
          if (guid === null) {
            setEntidadSeleccionada(null)
            return
          }
          const archivoActivo = archivoActualIdRef.current
          const proyId = proyectoIdRef.current
          if (!archivoActivo || !proyId) return
          setResolviendoPick(true)
          try {
            const entidades = await resolverEntidadesPorGuids(proyId, archivoActivo, [guid])
            setEntidadSeleccionada(entidades[0] ?? null)
          } catch (e) {
            setViewError((e as Error).message)
          } finally {
            setResolviendoPick(false)
          }
        },
      })
      if (cancelled) { handle.dispose(); return }
      viewerRef.current = handle
      setViewerReady(true)
    })()

    return () => {
      cancelled = true
      viewerRef.current?.dispose()
      viewerRef.current = null
      setViewerReady(false)
      setArchivoCargadoId(null)
    }
  }, [proyectoActivo?.id])

  // Auto-cargar el archivo principal cuando ya está listo y el viewer también.
  useEffect(() => {
    if (!viewerReady || !archivo) return
    if (archivo.estadoProcesamiento !== EstadoProcesamientoIfc.Completado) return
    if (archivoCargadoId === archivo.id) return
    if (loadingView) return

    void cargarArchivo(archivo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerReady, archivo, archivoCargadoId])

  async function cargarArchivo(a: ProyectoIfcArchivo) {
    if (!viewerRef.current || !proyectoActivo) return
    setViewError(null)
    setLoadingView(true)
    try {
      setPhase("Descargando archivo…")
      const ab = await downloadIfcBuffer(proyectoActivo.id, a.id, (p) => {
        const mb = Math.round((p.loaded / (1024 * 1024)) * 10) / 10
        const totalMb = p.total ? Math.round((p.total / (1024 * 1024)) * 10) / 10 : null
        const pct = p.total ? Math.round((p.loaded / p.total) * 100) : null
        setPhase(
          totalMb !== null
            ? `Descargando archivo… ${mb} / ${totalMb} MB (${pct}%)`
            : `Descargando archivo… ${mb} MB`
        )
      })

      setPhase("Parseando IFC (puede tardar varios segundos)…")
      await viewerRef.current.loadIfc(new Uint8Array(ab), a.nombre)
      setPhase("")
      setArchivoCargadoId(a.id)
    } catch (e) {
      setViewError((e as Error).message)
      setPhase("")
    } finally {
      setLoadingView(false)
    }
  }

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

  // Si el IFC principal todavía se está procesando, mostramos progreso.
  if (archivo.estadoProcesamiento !== EstadoProcesamientoIfc.Completado) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full rounded-lg border border-blue-200 bg-blue-50 p-6 text-center space-y-3">
          <div className="flex items-center justify-center">
            {archivo.estadoProcesamiento === EstadoProcesamientoIfc.Error
              ? <AlertTriangle className="h-10 w-10 text-red-500" />
              : <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />}
          </div>
          <h2 className="text-base font-semibold text-gray-800">{archivo.nombre}</h2>
          {archivo.estadoProcesamiento === EstadoProcesamientoIfc.Error ? (
            <p className="text-sm text-red-700">
              {archivo.errorProcesamiento ?? "El procesamiento falló."}
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
            <Settings className="h-3.5 w-3.5" /> Gestionar IFCs
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

      {/* Cuerpo: viewer + sidebar */}
      <div className="flex-1 flex min-h-0">
        <div className="relative flex-1 bg-white">
          <div ref={containerRef} className="absolute inset-0" />
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
          <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50/50 p-3 overflow-y-auto">
            <EntidadDetalleSidebar
              proyectoId={proyectoActivo.id}
              entidad={entidadSeleccionada}
              onClose={async () => {
                setEntidadSeleccionada(null)
                await viewerRef.current?.highlightByGuid(null)
              }}
            />
          </div>
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
