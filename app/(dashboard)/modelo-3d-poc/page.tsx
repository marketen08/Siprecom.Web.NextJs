"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LoadStats {
  fileName: string
  fileSizeMb: number
  parseSecs: number
  renderSecs: number
  totalItems: number
  approxMemoryMb: number | null
}

/**
 * PoC del viewer IFC — pasos para validar performance con archivos reales.
 * NO se sube nada al backend; la carga es 100% client-side via FileReader.
 * Si este PoC anda bien con un archivo de 140 MB, seguimos con la Fase 1
 * (que sí guarda en blob + persiste). Si se cuelga / OOM, pivoteamos a xeokit.
 */
export default function ModeloPoCPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ViewerHandle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<LoadStats | null>(null)
  const [phase, setPhase] = useState<string>("")
  const [url, setUrl] = useState<string>("")

  // Init del viewer al montar; cleanup al desmontar. Dynamic import para que
  // el bundle de @thatopen/components no se evalúe en SSR ni en otras rutas.
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
    })()

    return () => {
      cancelled = true
      viewerRef.current?.dispose()
      viewerRef.current = null
    }
  }, [])

  /** Helper compartido por la carga local y la carga remota — recibe el buffer ya leído. */
  async function loadBuffer(buffer: Uint8Array, fileName: string, sizeBytes: number) {
    if (!viewerRef.current) {
      setError("El viewer todavía no terminó de inicializar.")
      return
    }
    try {
      setPhase("Parseando IFC (puede tardar varios segundos)…")
      const t0 = performance.now()
      const { totalItems } = await viewerRef.current.loadIfc(buffer, fileName)
      const tParse = performance.now()

      setPhase("Renderizando…")
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const tRender = performance.now()

      // Algunos navegadores exponen memory; otros no. Best-effort.
      // performance.memory existe solo en Chromium con flag o en algunas
      // versiones. No tipeado en lib estándar.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mem = (performance as any).memory?.usedJSHeapSize
      const memMb = typeof mem === "number" ? Math.round(mem / (1024 * 1024)) : null

      setStats({
        fileName,
        fileSizeMb:      Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
        parseSecs:       Math.round((tParse - t0) / 100) / 10,
        renderSecs:      Math.round((tRender - tParse) / 100) / 10,
        totalItems,
        approxMemoryMb:  memMb,
      })
      setPhase("Listo.")
    } catch (e) {
      setError((e as Error).message)
      setPhase("")
    }
  }

  async function onFileSelected(file: File) {
    setError(null)
    setStats(null)
    setLoading(true)
    setPhase("Leyendo archivo…")
    try {
      const ab = await file.arrayBuffer()
      await loadBuffer(new Uint8Array(ab), file.name, file.size)
    } finally {
      setLoading(false)
    }
  }

  async function onLoadFromUrl() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null)
    setStats(null)
    setLoading(true)
    setPhase("Descargando IFC…")
    try {
      const res = await fetch(trimmed)
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el archivo.`)
      const ab = await res.arrayBuffer()
      const name = trimmed.split("/").pop() || "modelo.ifc"
      await loadBuffer(new Uint8Array(ab), name, ab.byteLength)
    } catch (e) {
      // CORS también cae acá: el fetch lanza TypeError ("Failed to fetch") cuando el
      // server remoto no permite el origen.
      const msg = (e as Error).message
      setError(msg.includes("Failed to fetch")
        ? `No se pudo descargar: ${msg}. Puede ser CORS — probá un origen que lo permita (ej. github raw, unpkg).`
        : msg)
      setPhase("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modelo 3D — PoC</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Carga local o remota de un archivo <code className="text-xs">.ifc</code> para validar
          performance del visor antes de meter la persistencia en backend.
          Nada se sube al servidor.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Carga local desde el filesystem. */}
          <label className="inline-flex items-center">
            <input
              type="file"
              accept=".ifc"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFileSelected(f)
                e.target.value = ""
              }}
            />
            <Button asChild disabled={loading} variant="outline" className="gap-2">
              <span className="cursor-pointer">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Elegir archivo local
              </span>
            </Button>
          </label>

          {/* Carga desde URL pública. CORS-dependiente: el origen tiene que permitir
              el fetch cross-origin (raw.githubusercontent.com lo permite). */}
          <div className="flex-1 min-w-72">
            <label className="text-xs font-medium text-gray-600">o URL pública del .ifc</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/modelo.ifc"
              disabled={loading}
              className="mt-1"
            />
          </div>
          <Button
            onClick={onLoadFromUrl}
            disabled={loading || !url.trim()}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Cargar desde URL
          </Button>
        </div>

        {/* Sugerencias rápidas: archivos públicos para probar. */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">Probar con:</span>
          <SuggestionButton
            disabled={loading}
            onPick={setUrl}
            url="https://raw.githubusercontent.com/IFCjs/test-ifc-files/main/Others/small.ifc"
            label="small.ifc (~1 MB)"
          />
          <SuggestionButton
            disabled={loading}
            onPick={setUrl}
            url="https://raw.githubusercontent.com/IFCjs/test-ifc-files/main/Others/medium.ifc"
            label="medium.ifc (~10 MB)"
          />
          <SuggestionButton
            disabled={loading}
            onPick={setUrl}
            url="https://raw.githubusercontent.com/buildingSMART/Sample-Test-Files/master/IFC%202x3/Duplex%20Apartment/Duplex_A_20110907_optimized.ifc"
            label="Duplex (~3 MB, IFC2x3)"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(loading || phase) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {phase}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Kpi label="Archivo" value={stats.fileName} small />
          <Kpi label="Tamaño" value={`${stats.fileSizeMb} MB`} />
          <Kpi label="Parseo" value={`${stats.parseSecs}s`} />
          <Kpi label="Render" value={`${stats.renderSecs}s`} />
          <Kpi label="Elementos" value={stats.totalItems.toLocaleString("es-AR")} />
          {stats.approxMemoryMb !== null && (
            <Kpi label="JS Heap" value={`~${stats.approxMemoryMb} MB`} />
          )}
        </div>
      )}

      {/* Canvas del viewer */}
      <div
        ref={containerRef}
        className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden relative"
        style={{ height: "70vh", minHeight: 480 }}
      />
    </div>
  )
}

function Kpi({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-bold tabular-nums mt-0.5 text-blue-900 ${small ? "text-sm truncate" : "text-xl"}`} title={value}>
        {value}
      </div>
    </div>
  )
}

/** Chip clickeable que rellena el input de URL con un IFC público. */
function SuggestionButton({
  url, label, disabled, onPick,
}: {
  url: string
  label: string
  disabled?: boolean
  onPick: (u: string) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(url)}
      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

// Tipo del handle exportado por features/modelo-3d/viewer.ts. Importarlo acá
// generaría carga en SSR, así que solo dejamos el contrato.
interface ViewerHandle {
  loadIfc: (buffer: Uint8Array, name?: string) => Promise<{ totalItems: number }>
  dispose: () => void
}
