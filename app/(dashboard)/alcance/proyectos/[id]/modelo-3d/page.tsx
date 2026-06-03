"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import {
  Box, Eye, FileUp, Loader2, Trash2,
} from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import {
  downloadIfcBuffer,
  useDeleteIfcArchivo,
  useGetIfcArchivos,
} from "@/features/modelo-3d/api/use-ifc-archivos"
import { UploadIfcSheet } from "@/features/modelo-3d/components/upload-ifc-sheet"
import type { ProyectoIfcArchivo } from "@/features/modelo-3d/types"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

// Tipo del handle del viewer. Se duplica acá para que la importación dinámica
// no arrastre @thatopen/components a SSR (mismo patrón que el PoC).
interface ViewerHandle {
  loadIfc: (buffer: Uint8Array, name?: string) => Promise<{ totalItems: number }>
  dispose: () => void
}

function ModeloPageContent() {
  const { id } = useParams<{ id: string }>()
  const { data: proyectoRaw } = useGetProyecto(id)
  const proyecto = proyectoRaw?.data

  const { data: archivosRaw, isLoading } = useGetIfcArchivos(id)
  const archivos = archivosRaw?.data ?? []

  const eliminar = useDeleteIfcArchivo(id)

  const [openUpload, setOpenUpload] = useState(false)

  useBreadcrumb(
    proyecto
      ? [
          { label: "Alcance" },
          { label: "Proyectos", href: "/alcance/proyectos" },
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

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    ;(async () => {
      const { createViewer } = await import("@/features/modelo-3d/viewer")
      if (cancelled) return
      const handle = await createViewer(container)
      if (cancelled) {
        handle.dispose()
        return
      }
      viewerRef.current = handle
      setViewerReady(true)
    })()

    return () => {
      cancelled = true
      viewerRef.current?.dispose()
      viewerRef.current = null
    }
  }, [])

  async function handleVisualizar(archivo: ProyectoIfcArchivo) {
    if (!viewerRef.current) {
      setViewError("El visor todavía no terminó de inicializar.")
      return
    }
    setViewError(null)
    setLoadingView(true)
    setActualId(archivo.id)
    try {
      setPhase("Descargando archivo…")
      const ab = await downloadIfcBuffer(id, archivo.id)

      setPhase("Parseando IFC (puede tardar varios segundos)…")
      await viewerRef.current.loadIfc(new Uint8Array(ab), archivo.nombre)
      setPhase("Listo.")
    } catch (e) {
      setViewError((e as Error).message)
      setPhase("")
      setActualId(null)
    } finally {
      setLoadingView(false)
    }
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
            Archivos IFC del proyecto. Hacé clic en <strong>Visualizar</strong> para abrirlo en el visor.
          </p>
        </div>
        <Button onClick={() => setOpenUpload(true)} className="gap-2">
          <FileUp className="h-4 w-4" />
          Cargar IFC
        </Button>
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
              disabled={loadingView || !viewerReady}
              onVisualizar={() => handleVisualizar(a)}
              onEliminar={() => eliminar.mutateAsync(a.id)}
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

      {/* Canvas del viewer */}
      <div
        ref={containerRef}
        className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden relative"
        style={{ height: "70vh", minHeight: 480 }}
      >
        {!actualId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-muted-foreground pointer-events-none">
            <Box className="h-10 w-10 mb-2 opacity-30" />
            {viewerReady ? "Elegí un archivo para visualizar." : "Inicializando visor…"}
          </div>
        )}
      </div>

      <UploadIfcSheet
        proyectoId={id}
        open={openUpload}
        onClose={() => setOpenUpload(false)}
      />
    </div>
  )
}

function ArchivoCard({
  archivo, activo, loading, disabled, onVisualizar, onEliminar,
}: {
  archivo: ProyectoIfcArchivo
  activo: boolean
  loading: boolean
  disabled: boolean
  onVisualizar: () => void
  onEliminar: () => Promise<unknown>
}) {
  const mb = archivo.tamanioBytes
    ? Math.round((archivo.tamanioBytes / (1024 * 1024)) * 10) / 10
    : null
  return (
    <div
      className={`rounded-lg border bg-white p-3 space-y-2 transition-colors ${
        activo ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
      }`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-gray-900 truncate" title={archivo.nombre}>
          {archivo.nombre}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {archivo.disciplina && (
            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 font-medium">
              {archivo.disciplina}
            </span>
          )}
          {mb !== null && <span>{mb} MB</span>}
        </div>
        {archivo.nombreArchivo && (
          <p className="text-xs text-gray-400 truncate" title={archivo.nombreArchivo}>
            {archivo.nombreArchivo}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant={activo ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={onVisualizar}
          disabled={disabled}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          {loading ? "Cargando…" : activo ? "En visor" : "Visualizar"}
        </Button>
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
    </div>
  )
}

export default function ModeloPage() {
  return (
    <Suspense>
      <ModeloPageContent />
    </Suspense>
  )
}
