"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, Box, ChevronDown, ChevronUp, Eye, Filter, Link as LinkIcon, Loader2, Menu, Palette, Settings, Star,
} from "lucide-react"

import { useSidebar } from "@/components/sidebar-context"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import type { Elemento } from "@/features/elementos/types"
import { useGetIfcPrincipal } from "@/features/modelo-3d/api/use-ifc-archivos"
import { resolverEntidadesPorGuids, getGuidsPorElemento } from "@/features/modelo-3d/api/use-ifc-entidades"
import { EntidadDetalleSidebar } from "@/features/modelo-3d/components/entidad-detalle-sidebar"
import { EntidadesPanel } from "@/features/modelo-3d/components/entidades-panel"
import { ElementosPanel } from "@/features/modelo-3d/components/elementos-panel"
import { FiltrosVisorPanel } from "@/features/modelo-3d/components/filtros-visor-panel"
import { LeyendaColoresEstado } from "@/features/modelo-3d/components/leyenda-colores-estado"
import { useFiltroVisor } from "@/features/modelo-3d/hooks/use-filtro-visor"
import { useColoresPorEstadoToggle } from "@/features/modelo-3d/hooks/use-colores-por-estado"
import { useColoresPorTestGroupToggle } from "@/features/modelo-3d/hooks/use-colores-por-testgroup"
import { LeyendaColoresTestGroup } from "@/features/modelo-3d/components/leyenda-colores-testgroup"
import {
  ApsTranslationStatus,
  EstadoProcesamientoIfc,
  FormatoArchivo3d,
  type ColoresPorEstado,
  type ColoresPorTestGroup,
  type ProyectoIfcArchivo,
  type ProyectoIfcEntidad,
} from "@/features/modelo-3d/types"

interface ViewerHandle {
  highlightByGuid: (guid: string | null) => Promise<void>
  selectByGuids: (guids: string[]) => void
  fitToGuids: (guids: string[]) => void
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
  applyColorPorEstado: (buckets: ColoresPorEstado | null) => Promise<void>
  applyColorPorTestGroup: (buckets: ColoresPorTestGroup | null) => Promise<void>
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
  const { toggle: toggleNav } = useSidebar()
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
  // Aviso neutro sobre el visor (ej. elemento sin piezas vinculadas).
  const [avisoMaqueta, setAvisoMaqueta] = useState<string | null>(null)
  // Toggles de los paneles inferiores (escondidos por default). El de elementos es
  // el principal; el de entidades es secundario (vinculado manual de piezas IFC).
  const [mostrarPanelElementos, setMostrarPanelElementos] = useState(false)
  const [mostrarPanelEntidades, setMostrarPanelEntidades] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  // Mobile: el detalle es un bottom sheet con dos alturas (medio / expandido).
  const [sheetExpanded, setSheetExpanded] = useState(false)
  // En mobile el sheet empuja el viewer hacia arriba y encuadramos la pieza en
  // la zona visible; en desktop el panel es columna lateral y NO movemos la
  // cámara en cada click (sería molesto). Gateamos el fit por este flag.
  const [isMobile, setIsMobile] = useState(false)
  // Guids a encuadrar tras la última selección (toda la línea/equipo si está
  // vinculada, o la pieza suelta si no). Lo consume el effect de fit.
  const fitGuidsRef = useRef<string[] | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

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

  // F7 del roadmap TestGroups: colorización por pack. Mutuamente excluyente con
  // Colores por estado — al prender uno, se apaga el otro (useEffect abajo).
  const coloresTestGroup = useColoresPorTestGroupToggle({
    proyectoId: proyectoActivo?.id ?? null,
    archivoId: archivo?.id ?? null,
    archivoCargado: archivoCargadoId !== null && archivoCargadoId === archivo?.id,
    applyColorPorTestGroup: (b) => viewerRef.current?.applyColorPorTestGroup(b) ?? Promise.resolve(),
    filtro: filtroVisor.filtro,
  })

  // Mutex: solo un modo de colorización activo a la vez.
  useEffect(() => {
    if (coloresEstado.activo && coloresTestGroup.activo) coloresTestGroup.setActivo(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloresEstado.activo])
  useEffect(() => {
    if (coloresTestGroup.activo && coloresEstado.activo) coloresEstado.setActivo(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloresTestGroup.activo])

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
            if (guids === null || guids.length === 0) {
              setEntidadSeleccionada(null)
              fitGuidsRef.current = null
              return
            }
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
              // Nueva selección → el sheet arranca a media altura.
              setSheetExpanded(false)
              setEntidadSeleccionada(elegida)

              // Si la entidad está vinculada a un Elemento, seleccionamos en el
              // visor TODAS las piezas de ese Elemento (toda la línea/equipo), no
              // solo la hoja clickeada. Esos mismos guids son los que encuadramos.
              if (elegida?.elementoId) {
                const guidsElemento = await getGuidsPorElemento(proyId, archivoActivo, elegida.elementoId)
                if (guidsElemento.length > 0) {
                  viewerRef.current?.selectByGuids(guidsElemento)
                  fitGuidsRef.current = guidsElemento
                } else {
                  fitGuidsRef.current = elegida.ifcGuid ? [elegida.ifcGuid] : null
                }
              } else {
                fitGuidsRef.current = elegida?.ifcGuid ? [elegida.ifcGuid] : null
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

  // Encuadre al seleccionar (solo mobile). Al abrir/cambiar el bottom sheet el
  // viewer cambia de alto; esperamos a que el layout se asiente (rAF), forzamos
  // un resize y recién ahí encuadramos, para que la pieza quede centrada en la
  // zona visible (no detrás del sheet). En desktop no movemos la cámara en cada
  // click — sería molesto. Re-corre también al expandir/colapsar el sheet.
  useEffect(() => {
    if (!isMobile || !viewerReady || !entidadSeleccionada) return
    const guids = fitGuidsRef.current
    if (!guids || guids.length === 0) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      viewerRef.current?.resize?.()
      raf2 = requestAnimationFrame(() => { viewerRef.current?.fitToGuids?.(guids) })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [entidadSeleccionada?.id, sheetExpanded, viewerReady, isMobile])

  async function seleccionarEntidadDesdeListado(entidad: ProyectoIfcEntidad) {
    setSheetExpanded(false)
    fitGuidsRef.current = entidad.ifcGuid ? [entidad.ifcGuid] : null
    setEntidadSeleccionada(entidad)
    await viewerRef.current?.highlightByGuid(entidad.ifcGuid)
  }

  // Seleccionar un Elemento desde el listado: resaltamos TODAS sus piezas en la
  // maqueta, las encuadramos, y abrimos el detalle reutilizando el sidebar (con
  // una entidad del elemento). Si el elemento no tiene piezas vinculadas, avisamos.
  async function seleccionarElementoDesdeListado(elemento: Elemento) {
    if (!proyectoActivo || !archivo) return
    setSheetExpanded(false)
    setAvisoMaqueta(null)
    setResolviendoPick(true)
    try {
      const guids = await getGuidsPorElemento(proyectoActivo.id, archivo.id, elemento.id)
      if (guids.length === 0) {
        setEntidadSeleccionada(null)
        fitGuidsRef.current = null
        await viewerRef.current?.highlightByGuid(null)
        setAvisoMaqueta(`El elemento ${elemento.tag} no tiene piezas vinculadas en la maqueta.`)
        return
      }
      viewerRef.current?.selectByGuids(guids)
      fitGuidsRef.current = guids
      viewerRef.current?.fitToGuids?.(guids)
      // Detalle: una entidad del elemento alimenta el sidebar existente.
      const entidades = await resolverEntidadesPorGuids(proyectoActivo.id, archivo.id, guids)
      const entidad = entidades.find((e) => e.elementoId === elemento.id) ?? entidades[0] ?? null
      setEntidadSeleccionada(entidad)
    } catch (e) {
      setViewError((e as Error).message)
    } finally {
      setResolviendoPick(false)
    }
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

  // Maqueta 3D deshabilitada (global o por proyecto). Guard para deep-links: el
  // item de menú ya se oculta, pero la URL es accesible directamente.
  if (!proyectoActivo.maqueta3d) {
    return (
      <EmptyState
        icon={<Box className="h-12 w-12 text-gray-300" />}
        title="Maqueta 3D deshabilitada"
        description="La funcionalidad de modelo 3D no está habilitada para este proyecto."
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
    <div className="flex flex-col" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Header slim con título + acciones */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-gray-200 bg-white px-3 sm:px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={toggleNav}
            className="-ml-1 shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú de navegación"
            title="Menú de navegación"
          >
            <Menu className="h-4 w-4" />
          </button>
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
            <span className="hidden sm:inline">Filtros</span>
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
            <span className="hidden sm:inline">Colores por estado</span>
          </button>
          <button
            type="button"
            onClick={() => coloresTestGroup.setActivo((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              coloresTestGroup.activo
                ? "text-sky-700 bg-sky-50 border-sky-200"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            title="Pintar entidades con color según el TestGroup al que pertenecen"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Colores por pack</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMostrarPanelElementos((v) => !v)
              setMostrarPanelEntidades(false)
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              mostrarPanelElementos ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mostrarPanelElementos ? "Ocultar elementos" : "Ver elementos"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMostrarPanelEntidades((v) => !v)
              setMostrarPanelElementos(false)
            }}
            title="Vincular manualmente piezas IFC a elementos"
            className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium transition-colors ${
              mostrarPanelEntidades ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mostrarPanelEntidades ? "Ocultar entidades" : "Entidades"}</span>
          </button>
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
      {avisoMaqueta && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-700 flex items-center justify-between gap-2">
          <span>{avisoMaqueta}</span>
          <button type="button" onClick={() => setAvisoMaqueta(null)} className="text-amber-600 hover:text-amber-800 leading-none">
            ✕
          </button>
        </div>
      )}

      {/* Cuerpo: en desktop son 3 columnas (filtros · viewer · detalle). En mobile
          el viewer ocupa la franja superior; el detalle es un bottom sheet que lo
          empuja hacia arriba (la maqueta queda siempre visible y el fit la encuadra
          en la zona libre), y los filtros se muestran como overlay inferior. */}
      <div className="relative flex-1 flex flex-col md:flex-row min-h-0 md:gap-3 md:p-3">
        {mostrarFiltros && (
          <div className="absolute inset-x-0 bottom-0 z-30 h-[70vh] p-3 md:static md:z-auto md:h-full md:w-auto md:shrink-0 md:p-0">
            <FiltrosVisorPanel
              filtro={filtroVisor.filtro}
              onChange={filtroVisor.setFiltro}
              totalCoinciden={filtroVisor.resultado?.totalCoinciden ?? null}
              totalEntidades={filtroVisor.resultado?.totalEntidades ?? null}
              loading={filtroVisor.loading}
              onClose={() => setMostrarFiltros(false)}
              proyectoId={proyectoActivo?.id ?? null}
              archivoId={archivo?.id ?? null}
            />
          </div>
        )}
        <div className="relative flex-1 min-h-0 bg-white overflow-hidden md:rounded-lg md:border md:border-gray-200 md:shadow-sm">
          <div ref={setContainerRef} className="absolute inset-0" />
          {coloresEstado.activo && (
            <div className="absolute top-3 left-3 z-10">
              <LeyendaColoresEstado buckets={coloresEstado.buckets} loading={coloresEstado.loading} />
            </div>
          )}
          {coloresTestGroup.activo && (
            <div className="absolute top-3 left-3 z-10">
              <LeyendaColoresTestGroup buckets={coloresTestGroup.buckets} loading={coloresTestGroup.loading} />
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
          <div
            className={`flex shrink-0 flex-col bg-white md:bg-transparent md:h-full ${
              sheetExpanded ? "h-[82vh]" : "h-[44vh]"
            }`}
          >
            {/* Grabber + toggle de altura del sheet — solo mobile */}
            <button
              type="button"
              onClick={() => setSheetExpanded((v) => !v)}
              className="md:hidden flex shrink-0 items-center justify-center gap-1.5 border-t border-gray-200 bg-white py-2 text-gray-400"
              aria-label={sheetExpanded ? "Contraer panel" : "Expandir panel"}
            >
              {sheetExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
            </button>
            <div className="min-h-0 flex-1">
              <EntidadDetalleSidebar
                proyectoId={proyectoActivo.id}
                entidad={entidadSeleccionada}
                onClose={async () => {
                  setEntidadSeleccionada(null)
                  fitGuidsRef.current = null
                  await viewerRef.current?.highlightByGuid(null)
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Panel de elementos (principal) — buscar y ubicar un Elemento en la maqueta. */}
      {mostrarPanelElementos && (
        <div className="border-t border-gray-200 bg-white p-4 max-h-[40vh] overflow-y-auto">
          <ElementosPanel
            onSeleccionar={seleccionarElementoDesdeListado}
            elementoSeleccionadoId={entidadSeleccionada?.elementoId ?? null}
          />
        </div>
      )}

      {/* Panel de entidades (secundario) — vinculado manual de piezas IFC sin TAG. */}
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
