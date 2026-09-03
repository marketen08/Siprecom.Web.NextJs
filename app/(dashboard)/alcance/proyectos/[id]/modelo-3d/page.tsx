"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import {
  AlertTriangle, Box, CheckCircle2, Cloud, Download, Eye, FileJson, FileUp, Filter, Link2, Loader2, Palette, RefreshCw, ScanSearch, Star, Trash2, Wrench,
} from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import {
  descargarMaquetaJson,
  useDeleteIfcArchivo,
  useGetIfcArchivos,
  useMarcarIfcPrincipal,
} from "@/features/modelo-3d/api/use-ifc-archivos"
import { ImportarMaquetaJsonSheet } from "@/features/modelo-3d/components/importar-maqueta-json-dialog"
import {
  resolverEntidadesPorGuids,
  getGuidsPorElemento,
  useProcesarIfcArchivo,
  useReBootstrapIfcArchivo,
  useRematchIfcArchivo,
} from "@/features/modelo-3d/api/use-ifc-entidades"
import { UploadIfcSheet } from "@/features/modelo-3d/components/upload-ifc-sheet"
import { CodificacionesSheet } from "@/features/modelo-3d/components/codificaciones-sheet"
import { ImportarDesdeApsSheet } from "@/features/aps/components/importar-desde-aps-sheet"
import { EntidadesPanel } from "@/features/modelo-3d/components/entidades-panel"
import { EntidadDetalleSidebar } from "@/features/modelo-3d/components/entidad-detalle-sidebar"
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

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

interface ViewerHandle {
  highlightByGuid: (guid: string | null) => Promise<void>
  selectByGuids: (guids: string[]) => void
  fitToGuids: (guids: string[]) => void
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
  applyColorPorEstado: (buckets: ColoresPorEstado | null) => Promise<void>
  resize: () => void
  dispose: () => void
}

function ModeloPageContent() {
  const { id } = useParams<{ id: string }>()
  const { data: proyectoRaw } = useGetProyecto(id)
  const proyecto = proyectoRaw?.data

  const { data: archivosRaw, isLoading } = useGetIfcArchivos(id)
  const archivos = archivosRaw?.data ?? []

  const eliminar = useDeleteIfcArchivo(id)
  const procesar = useProcesarIfcArchivo(id)
  const reBootstrap = useReBootstrapIfcArchivo(id)
  const rematch = useRematchIfcArchivo(id)
  const marcarPrincipal = useMarcarIfcPrincipal(id)
  // Al terminar el rematch mostramos un feedback simple con el resultado.
  const [rematchMsg, setRematchMsg] = useState<{ archivoId: string; mensaje: string; ok: boolean } | null>(null)

  async function handleRematch(archivoId: string) {
    try {
      const res = await rematch.mutateAsync(archivoId)
      const data = res?.data
      setRematchMsg({
        archivoId,
        mensaje: data?.mensaje ?? "Re-vinculación completada.",
        ok: (data?.entidadesVinculadas ?? 0) > 0,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo re-vincular."
      setRematchMsg({ archivoId, mensaje: msg, ok: false })
    }
  }

  const [openUpload, setOpenUpload] = useState(false)
  const [openAps, setOpenAps] = useState(false)
  const [openImportJson, setOpenImportJson] = useState(false)

  useBreadcrumb(
    proyecto
      ? [
          { label: "Alcance" },
          { label: "Proyecto", href: "/alcance/proyecto" },
          { label: proyecto.nombre, href: `/alcance/proyectos/${id}` },
          { label: "Modelo 3D" },
        ]
      : null
  )

  // ─── Viewer ───────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ViewerHandle | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [loadingView, setLoadingView] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [phase, setPhase] = useState<string>("")
  const [actualId, setActualId] = useState<string | null>(null)

  // Detalle de la entidad seleccionada (por click en 3D o desde el panel).
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<ProyectoIfcEntidad | null>(null)
  const [resolviendoPick, setResolviendoPick] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  // Cuál archivo está cargado en el visor (para el hook de filtros saber si puede aplicar ghost).
  const [archivoCargadoId, setArchivoCargadoId] = useState<string | null>(null)

  const filtroVisor = useFiltroVisor({
    proyectoId: id,
    archivoId: actualId,
    archivoCargado: archivoCargadoId !== null && archivoCargadoId === actualId,
    applyGhost: (guids, opts) => viewerRef.current?.applyGhost(guids, opts) ?? Promise.resolve(),
  })

  const coloresEstado = useColoresPorEstadoToggle({
    proyectoId: id,
    archivoId: actualId,
    archivoCargado: archivoCargadoId !== null && archivoCargadoId === actualId,
    applyColorPorEstado: (b) => viewerRef.current?.applyColorPorEstado(b) ?? Promise.resolve(),
    filtro: filtroVisor.filtro,
  })

  const archivoActual = actualId
    ? archivos.find((a) => a.id === actualId) ?? null
    : null

  // Ref para usar el archivo activo dentro del closure del onPick (sin re-crear
  // el viewer cada vez que cambia el archivo).
  const actualIdRef = useRef<string | null>(null)
  actualIdRef.current = actualId

  // Crea/recrea el viewer cuando cambia el archivo seleccionado. Despacha por
  // formato vía createUnifiedViewer: IFC → @thatopen (descarga + parseo local);
  // NWD → Autodesk Viewer (SVF2 vía APS). Antes este page usaba solo el motor
  // IFC, así que los NWD no se visualizaban.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !actualId || !archivoActual) return
    // Esperar a que el pipeline del formato esté Completado.
    if (archivoActual.formatoArchivo === FormatoArchivo3d.Ifc
        && archivoActual.estadoProcesamiento !== EstadoProcesamientoIfc.Completado) return
    if (archivoActual.formatoArchivo === FormatoArchivo3d.Nwd
        && archivoActual.apsTranslationStatus !== ApsTranslationStatus.Completado) return

    let cancelled = false
    setViewError(null)
    setLoadingView(true)
    setViewerReady(false)
    setArchivoCargadoId(null)

    ;(async () => {
      try {
        // Dispose del viewer previo (puede ser de otro motor/formato).
        viewerRef.current?.dispose()
        viewerRef.current = null

        const { createUnifiedViewer } = await import("@/features/modelo-3d/unified-viewer")
        if (cancelled) return
        const handle = await createUnifiedViewer(container, archivoActual, id, {
          onPick: async (guids) => {
            if (guids === null || guids.length === 0) {
              setEntidadSeleccionada(null)
              return
            }
            const archivoActivo = actualIdRef.current
            if (!archivoActivo) return
            setResolviendoPick(true)
            try {
              // guids = cadena hoja→raíz (APS) o un único guid (IFC). Elegimos la
              // entidad que matchea el guid más profundo.
              const entidades = await resolverEntidadesPorGuids(id, archivoActivo, guids)
              const porGuid = new Map(entidades.map((e) => [e.ifcGuid, e]))
              const elegida = guids.map((g) => porGuid.get(g)).find(Boolean) ?? null
              setEntidadSeleccionada(elegida)

              // Seleccionar TODAS las piezas del Elemento (línea/equipo completo).
              if (elegida?.elementoId) {
                const guidsElemento = await getGuidsPorElemento(id, archivoActivo, elegida.elementoId)
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
        setArchivoCargadoId(actualId)
        setPhase("")
      } catch (e) {
        if (!cancelled) {
          setViewError((e as Error).message)
          setPhase("")
          setArchivoCargadoId(null)
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
    }
  }, [id, actualId, archivoActual?.formatoArchivo, archivoActual?.estadoProcesamiento, archivoActual?.apsTranslationStatus])

  // ResizeObserver: si el contenedor cambia de tamaño (ej. se abre el panel
  // lateral de filtros), avisarle al viewer que recalcule. Sin esto el click
  // queda desfasado en el eje X.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { viewerRef.current?.resize?.() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewerReady])

  // Cuando se selecciona una entidad desde el panel inferior, sincronizamos el
  // highlight del viewer.
  async function seleccionarEntidadDesdeListado(entidad: ProyectoIfcEntidad) {
    setEntidadSeleccionada(entidad)
    await viewerRef.current?.highlightByGuid(entidad.ifcGuid)
  }

  // Selecciona el archivo a visualizar. La carga (descarga+parseo IFC, o APS para
  // NWD) la maneja el effect de arriba según el formato.
  function handleVisualizar(archivo: ProyectoIfcArchivo) {
    setViewError(null)
    setEntidadSeleccionada(null)
    setActualId(archivo.id)
  }

  // Maqueta 3D deshabilitada (global o por proyecto). Guard para deep-links: el
  // botón de acceso ya se oculta, pero la URL es accesible directamente.
  if (proyecto && proyecto.funcionalidadesEfectivas?.MAQUETA_3D === false) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Box className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-lg font-semibold text-gray-900">Maqueta 3D deshabilitada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La funcionalidad de modelo 3D no está habilitada para este proyecto.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Box className="h-6 w-6 text-blue-600" />
            Modelo 3D
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Archivos IFC del proyecto. Después de subir, el sistema parsea las entidades
            y trata de vincularlas con los Elementos del proyecto por TAG.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actualId && (
            <Button
              variant={mostrarFiltros || filtroVisor.activo ? "default" : "outline"}
              onClick={() => setMostrarFiltros((v) => !v)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {filtroVisor.activo && filtroVisor.resultado && (
                <span className="rounded-full bg-white/30 text-current px-1.5 text-[10px] font-bold">
                  {filtroVisor.resultado.totalCoinciden}
                </span>
              )}
            </Button>
          )}
          {actualId && (
            <Button
              variant={coloresEstado.activo ? "default" : "outline"}
              onClick={() => coloresEstado.setActivo((v) => !v)}
              className="gap-2"
              title="Pintar entidades con color según el estado del Elemento vinculado"
            >
              <Palette className="h-4 w-4" />
              Colores por estado
            </Button>
          )}
          <Button onClick={() => setOpenImportJson(true)} variant="outline" className="gap-2">
            <FileJson className="h-4 w-4" />
            Importar JSON
          </Button>
          <Button onClick={() => setOpenAps(true)} variant="outline" className="gap-2">
            <Cloud className="h-4 w-4" />
            Importar de Autodesk
          </Button>
          <Button onClick={() => setOpenUpload(true)} className="gap-2">
            <FileUp className="h-4 w-4" />
            Cargar IFC
          </Button>
        </div>
      </div>

      {/* Listado de archivos */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando archivos…
        </div>
      ) : archivos.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-muted-foreground">
          Sin archivos IFC cargados. Usá <strong>Cargar IFC</strong> para subir el primero.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {archivos.map((a) => (
            <ArchivoCard
              key={a.id}
              archivo={a}
              activo={actualId === a.id}
              loading={loadingView && actualId === a.id}
              disabledVisualizar={
                loadingView ||
                (a.formatoArchivo === FormatoArchivo3d.Nwd
                  ? a.apsTranslationStatus !== ApsTranslationStatus.Completado
                  : a.estadoProcesamiento !== EstadoProcesamientoIfc.Completado)
              }
              procesando={procesar.isPending && procesar.variables === a.id}
              reBootstrapeando={reBootstrap.isPending && reBootstrap.variables === a.id}
              rematcheando={rematch.isPending && rematch.variables === a.id}
              marcandoPrincipal={marcarPrincipal.isPending && marcarPrincipal.variables === a.id}
              rematchMsg={rematchMsg && rematchMsg.archivoId === a.id ? rematchMsg : null}
              onCloseRematchMsg={() => setRematchMsg(null)}
              onVisualizar={() => handleVisualizar(a)}
              onProcesar={() => procesar.mutateAsync(a.id)}
              onReBootstrap={() => reBootstrap.mutateAsync(a.id)}
              onRematch={() => handleRematch(a.id)}
              onMarcarPrincipal={() => marcarPrincipal.mutateAsync(a.id)}
              onEliminar={() => eliminar.mutateAsync(a.id)}
              onExportarJson={() => descargarMaquetaJson(id, a.id, a.nombre)}
            />
          ))}
        </div>
      )}

      {viewError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {viewError}
        </div>
      )}

      {(loadingView || phase) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 flex items-center gap-2">
          {loadingView && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase}
        </div>
      )}

      {/* Canvas del viewer + sidebar de detalle al costado */}
      <div className="flex gap-4" style={{ height: "70vh", minHeight: 480 }}>
        {mostrarFiltros && actualId && (
          <FiltrosVisorPanel
            filtro={filtroVisor.filtro}
            onChange={filtroVisor.setFiltro}
            totalCoinciden={filtroVisor.resultado?.totalCoinciden ?? null}
            totalEntidades={filtroVisor.resultado?.totalEntidades ?? null}
            loading={filtroVisor.loading}
            onClose={() => setMostrarFiltros(false)}
          />
        )}
        <div
          ref={containerRef}
          className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden relative"
        >
          {coloresEstado.activo && (
            <div className="absolute top-3 left-3 z-10">
              <LeyendaColoresEstado buckets={coloresEstado.buckets} loading={coloresEstado.loading} />
            </div>
          )}
          {!actualId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground pointer-events-none">
              <Box className="h-10 w-10 mb-2 opacity-30" />
              Elegí un archivo para visualizar.
            </div>
          )}
          {actualId && !entidadSeleccionada && !resolviendoPick && (
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
            proyectoId={id}
            entidad={entidadSeleccionada}
            onClose={async () => {
              setEntidadSeleccionada(null)
              await viewerRef.current?.highlightByGuid(null)
            }}
          />
        )}
      </div>

      {/* Panel de entidades del archivo activo (solo cuando hay procesamiento Completado) */}
      {archivoActual && archivoActual.estadoProcesamiento === EstadoProcesamientoIfc.Completado && (
        <EntidadesPanel
          proyectoId={id}
          archivoId={archivoActual.id}
          onSeleccionar={seleccionarEntidadDesdeListado}
          entidadSeleccionadaId={entidadSeleccionada?.id ?? null}
          filtroVisor={filtroVisor.filtro}
        />
      )}

      <UploadIfcSheet
        proyectoId={id}
        open={openUpload}
        onClose={() => setOpenUpload(false)}
      />
      <ImportarDesdeApsSheet
        proyectoId={id}
        open={openAps}
        onClose={() => setOpenAps(false)}
      />
      <ImportarMaquetaJsonSheet
        proyectoId={id}
        open={openImportJson}
        onClose={() => setOpenImportJson(false)}
      />
    </div>
  )
}

// ─── Card de archivo IFC ───────────────────────────────────────────────────

function ArchivoCard({
  archivo, activo, loading, disabledVisualizar, procesando, reBootstrapeando, rematcheando, marcandoPrincipal,
  rematchMsg, onCloseRematchMsg,
  onVisualizar, onProcesar, onReBootstrap, onRematch, onMarcarPrincipal, onEliminar, onExportarJson,
}: {
  archivo: ProyectoIfcArchivo
  activo: boolean
  loading: boolean
  disabledVisualizar: boolean
  procesando: boolean
  reBootstrapeando: boolean
  rematcheando: boolean
  marcandoPrincipal: boolean
  rematchMsg: { mensaje: string; ok: boolean } | null
  onCloseRematchMsg: () => void
  onVisualizar: () => void
  onProcesar: () => Promise<unknown>
  onReBootstrap: () => Promise<unknown>
  onRematch: () => Promise<unknown>
  onMarcarPrincipal: () => Promise<unknown>
  onEliminar: () => Promise<unknown>
  onExportarJson: () => Promise<unknown>
}) {
  const [exportando, setExportando] = useState(false)
  const handleExportar = async () => {
    setExportando(true)
    try { await onExportarJson() } finally { setExportando(false) }
  }
  const mb = archivo.tamanioBytes
    ? Math.round((archivo.tamanioBytes / (1024 * 1024)) * 10) / 10
    : null
  const [codisOpen, setCodisOpen] = useState(false)
  // Analizar TAGs solo aplica a NWD ya traducido (usa properties APS). Incluye
  // los que quedaron en Error: el estado es compartido entre la traducción APS y
  // nuestro bootstrap, así que un bootstrap fallido (property names que no
  // matchean) marca Error sobre una traducción que salió bien — y es justo el
  // caso donde el usuario necesita este analizador para destrabarse. El backend
  // valida el manifest antes de leer properties.
  const puedeAnalizar = archivo.formatoArchivo === FormatoArchivo3d.Nwd
    && (archivo.apsTranslationStatus === ApsTranslationStatus.Completado
      || archivo.apsTranslationStatus === ApsTranslationStatus.Error)
  return (
    <div
      className={`rounded-lg border bg-white p-3 space-y-2 transition-colors ${
        activo ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
      }`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5" title={archivo.nombre}>
          {archivo.esPrincipal && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" aria-label="Principal" />
          )}
          {archivo.nombre}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {archivo.esPrincipal && (
            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-medium">
              Principal
            </span>
          )}
          {archivo.disciplina && (
            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 font-medium">
              {archivo.disciplina}
            </span>
          )}
          {mb !== null && <span>{mb} MB</span>}
        </div>
      </div>

      <EstadoProcesamientoBadge archivo={archivo} />

      {rematchMsg && (
        <div
          className={`rounded-md border px-2.5 py-2 text-xs flex items-start justify-between gap-2 ${
            rematchMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="min-w-0 flex-1 leading-snug">{rematchMsg.mensaje}</span>
          <button
            type="button"
            onClick={onCloseRematchMsg}
            className="shrink-0 -mt-0.5 -mr-0.5 rounded px-1 leading-none text-sm hover:bg-black/5"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant={activo ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={onVisualizar}
          disabled={disabledVisualizar}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          {loading ? "Cargando…" : activo ? "En visor" : "Visualizar"}
        </Button>
        <button
          type="button"
          onClick={onMarcarPrincipal}
          disabled={marcandoPrincipal || archivo.esPrincipal}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors disabled:opacity-50 ${
            archivo.esPrincipal
              ? "border-amber-200 bg-amber-50 text-amber-600 cursor-default"
              : "border-input bg-white text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
          }`}
          title={archivo.esPrincipal ? "Es el IFC principal del proyecto" : "Marcar como principal"}
        >
          {marcandoPrincipal
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Star className={`h-3.5 w-3.5 ${archivo.esPrincipal ? "fill-amber-400" : ""}`} />}
        </button>
        <button
          type="button"
          onClick={onProcesar}
          disabled={procesando
            || archivo.estadoProcesamiento === EstadoProcesamientoIfc.Procesando
            || archivo.apsTranslationStatus === ApsTranslationStatus.EnProceso
            || archivo.apsTranslationStatus === ApsTranslationStatus.Pendiente}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors disabled:opacity-50"
          title="Re-procesar"
        >
          {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
        {puedeAnalizar && (
          <button
            type="button"
            onClick={() => setCodisOpen(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Analizar codificaciones de TAG"
          >
            <ScanSearch className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRematch}
          disabled={rematcheando}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors disabled:opacity-50"
          title="Vincular con elementos actuales (bulk match por TAG)"
        >
          {rematcheando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleExportar}
          disabled={exportando}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors disabled:opacity-50"
          title="Exportar a JSON (para reutilizar en otro proyecto)"
        >
          {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
        <ConfirmActionDialog
          trigger={reBootstrapeando
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wrench className="h-3.5 w-3.5" />}
          triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors disabled:opacity-50"
          title="¿Re-armar la estructura desde cero?"
          description={
            <>
              Esto <strong>borra todos los Sistemas, SubSistemas y Elementos</strong> del
              proyecto (más tareas, pendientes y planificación) y vuelve a correr el
              bootstrap de <strong>{archivo.nombre}</strong> con la config de
              «property names» actual. No se puede deshacer.
              <br />
              <span className="text-xs text-muted-foreground">
                Si el proyecto ya tiene registros de avance cargados, la operación se
                rechaza para no perder ese trabajo.
              </span>
            </>
          }
          confirmText="Re-armar"
          pendingText="Re-armando…"
          variant="destructive"
          onConfirm={onReBootstrap}
        />
        <ConfirmActionDialog
          trigger={<Trash2 className="h-3.5 w-3.5" />}
          triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
          title="¿Eliminar archivo IFC?"
          description={
            <>
              Vas a eliminar <strong>{archivo.nombre}</strong>. Esta acción no se puede deshacer.
            </>
          }
          confirmText="Eliminar"
          pendingText="Eliminando…"
          variant="destructive"
          onConfirm={onEliminar}
        />
      </div>

      {puedeAnalizar && (
        <CodificacionesSheet
          open={codisOpen}
          onClose={() => setCodisOpen(false)}
          proyectoId={archivo.proyectoId}
          archivoId={archivo.id}
          archivoNombre={archivo.nombre}
        />
      )}
    </div>
  )
}

function EstadoProcesamientoBadge({ archivo }: { archivo: ProyectoIfcArchivo }) {
  // Para archivos NWD el procesamiento real corre por APS (Model Derivative +
  // bootstrap), no por xbim. El estadoProcesamiento queda en Completado por
  // construcción — el badge muestra el ApsTranslationStatus en su lugar.
  if (archivo.formatoArchivo === FormatoArchivo3d.Nwd) {
    return <ApsTranslationBadge archivo={archivo} />
  }
  const accionLabel = archivo.esArchivoBootstrap
    ? "Bootstrap (creando proyecto)"
    : "Procesando con xbim"
  switch (archivo.estadoProcesamiento) {
    case EstadoProcesamientoIfc.Pendiente:
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> En cola para {archivo.esArchivoBootstrap ? "bootstrap" : "procesar"}…
        </div>
      )
    case EstadoProcesamientoIfc.Procesando:
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> {accionLabel}…
        </div>
      )
    case EstadoProcesamientoIfc.Error:
      return (
        <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded-md px-2 py-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="min-w-0 whitespace-pre-line wrap-break-word">
            Error: {archivo.errorProcesamiento ?? "fallo al procesar"}
          </span>
        </div>
      )
    case EstadoProcesamientoIfc.Completado: {
      const det = archivo.entidadesDetectadas ?? 0
      const vin = archivo.entidadesVinculadas ?? 0
      const pct = det > 0 ? Math.round((vin / det) * 100) : 0
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
          <CheckCircle2 className="h-3 w-3" />
          {vin.toLocaleString("es-AR")} de {det.toLocaleString("es-AR")} vinculadas ({pct}%)
        </div>
      )
    }
    default:
      return null
  }
}

/**
 * Badge para el pipeline APS (NWD). Se muestra en lugar del badge de IFC cuando
 * el archivo es NWD. El "Completado" de NWD significa que la translation a SVF2
 * terminó + las entidades están vinculadas con Elementos.
 */
function ApsTranslationBadge({ archivo }: { archivo: ProyectoIfcArchivo }) {
  const accionLabel = archivo.esArchivoBootstrap
    ? "Bootstrap NWD (creando proyecto)"
    : "Traduciendo a SVF2"
  switch (archivo.apsTranslationStatus) {
    case ApsTranslationStatus.Pendiente:
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> En cola para APS…
        </div>
      )
    case ApsTranslationStatus.EnProceso: {
      const pct = archivo.apsTranslationProgress ?? null
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> {accionLabel}
          {pct !== null && ` (${pct}%)`}…
        </div>
      )
    }
    case ApsTranslationStatus.Error:
      return (
        <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded-md px-2 py-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          {/* Sin truncate: el error del bootstrap trae la lista de properties
              candidatas del modelo — cortarla a una línea la volvía inútil.
              whitespace-pre-line respeta los saltos que arma el backend. */}
          <span className="min-w-0 whitespace-pre-line wrap-break-word">
            Error APS: {archivo.apsTranslationError ?? "fallo al traducir"}
          </span>
        </div>
      )
    case ApsTranslationStatus.Completado: {
      const det = archivo.entidadesDetectadas ?? 0
      const vin = archivo.entidadesVinculadas ?? 0
      const pct = det > 0 ? Math.round((vin / det) * 100) : 0
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
          <CheckCircle2 className="h-3 w-3" />
          {vin.toLocaleString("es-AR")} de {det.toLocaleString("es-AR")} vinculadas ({pct}%)
        </div>
      )
    }
    default:
      return null
  }
}

export default function ModeloPage() {
  return (
    <Suspense>
      <ModeloPageContent />
    </Suspense>
  )
}
