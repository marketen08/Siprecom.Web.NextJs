"use client"

import { useEffect, useRef, useState } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  async function onFileSelected(file: File) {
    if (!viewerRef.current) {
      setError("El viewer todavía no terminó de inicializar.")
      return
    }
    setError(null)
    setStats(null)
    setLoading(true)
    setPhase("Leyendo archivo…")

    try {
      // Leemos como Uint8Array para pasárselo a IfcLoader.
      const ab = await file.arrayBuffer()
      const buffer = new Uint8Array(ab)

      setPhase("Parseando IFC (puede tardar varios segundos)…")
      const t0 = performance.now()
      const { totalItems } = await viewerRef.current.loadIfc(buffer)
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
        fileName:        file.name,
        fileSizeMb:      Math.round(file.size / (1024 * 1024) * 100) / 100,
        parseSecs:       Math.round((tParse - t0) / 100) / 10,
        renderSecs:      Math.round((tRender - tParse) / 100) / 10,
        totalItems,
        approxMemoryMb:  memMb,
      })
      setPhase("Listo.")
    } catch (e) {
      setError((e as Error).message)
      setPhase("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelo 3D — PoC</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Carga local de un archivo <code className="text-xs">.ifc</code> para validar
            performance del visor antes de meter la persistencia en backend.
            Nada se sube al servidor.
          </p>
        </div>
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
          <Button asChild disabled={loading} className="gap-2">
            <span className="cursor-pointer">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {loading ? "Cargando…" : "Elegir archivo IFC"}
            </span>
          </Button>
        </label>
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

// Tipo del handle exportado por features/modelo-3d/viewer.ts. Importarlo acá
// generaría carga en SSR, así que solo dejamos el contrato.
interface ViewerHandle {
  loadIfc: (buffer: Uint8Array) => Promise<{ totalItems: number }>
  dispose: () => void
}
