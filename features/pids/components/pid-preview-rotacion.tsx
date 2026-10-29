"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, RotateCw } from "lucide-react"

import { loadPdfjs } from "../lib/pid-viewer-lib"
import type { RotacionGrados } from "../api/use-mutate-pids"
import { Button } from "@/components/ui/button"

interface PidPreviewRotacionProps {
  archivo: File
  rotacion: RotacionGrados
  onRotacionChange: (r: RotacionGrados) => void
  disabled?: boolean
}

/** Lo mínimo que usamos del PDFDocumentProxy / PDFPageProxy de pdfjs. */
interface PdfViewportLike { width: number; height: number }
interface PdfPageLike {
  rotate: number
  getViewport(params: { scale: number; rotation?: number }): PdfViewportLike
  render(params: {
    canvasContext: CanvasRenderingContext2D
    viewport: PdfViewportLike
    canvas?: HTMLCanvasElement
  }): { cancel: () => void; promise: Promise<void> }
}
interface PdfDocLike {
  getPage(n: number): Promise<PdfPageLike>
  destroy?: () => void
}

/** Ancho máximo del preview, en px CSS. */
const PREVIEW_MAX = 320

function girar(actual: RotacionGrados, delta: number): RotacionGrados {
  return (((actual + delta) % 360) + 360) % 360 as RotacionGrados
}

/**
 * Previsualización de la primera página del PDF con controles para girarlo.
 *
 * Muchos PID llegan como una imagen convertida a PDF, con el plano acostado y
 * sin declarar rotación. La rotación que se elija acá no es una preferencia de
 * vista: viaja al backend y se escribe en el archivo antes de guardarlo, así el
 * plano queda derecho en el visor, en la descarga y al imprimirlo. Hacerlo en
 * la carga además evita tener que recolocar pines, porque todavía no hay.
 */
export function PidPreviewRotacion({
  archivo,
  rotacion,
  onRotacionChange,
  disabled,
}: PidPreviewRotacionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  // El doc se mantiene entre rotaciones: girar no vuelve a parsear el PDF.
  const docRef = useRef<PdfDocLike | null>(null)
  const renderRef = useRef<{ cancel: () => void } | null>(null)

  // Cargar el PDF. El caller monta este componente con `key` por archivo, así
  // que al elegir otro PDF se remonta y el estado arranca limpio — no hace
  // falta resetearlo acá.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        const buf = await archivo.arrayBuffer()
        if (cancelado) return
        const doc: PdfDocLike = await pdfjs.getDocument({ data: buf }).promise
        if (cancelado) { doc.destroy?.(); return }
        docRef.current = doc
        setCargando(false)
      } catch (e) {
        if (!cancelado) {
          setError((e as Error).message)
          setCargando(false)
        }
      }
    })()
    return () => {
      cancelado = true
      renderRef.current?.cancel()
      docRef.current?.destroy?.()
      docRef.current = null
    }
  }, [archivo])

  /**
   * Devuelve el mensaje de error en vez de setearlo, para que el estado lo
   * actualice el efecto una vez resuelta la promesa y no durante su cuerpo.
   * `null` = salió bien o fue una cancelación esperable.
   */
  const dibujar = useCallback(async (): Promise<string | null> => {
    const doc = docRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas) return null
    try {
      const page = await doc.getPage(1)
      // `rotation` en pdfjs es absoluta, así que le sumamos la del archivo para
      // mostrar exactamente lo que va a quedar guardado (el backend hace el
      // mismo cálculo sobre /Rotate).
      const rotationFinal = (((page.rotate + rotacion) % 360) + 360) % 360
      const natural = page.getViewport({ scale: 1, rotation: rotationFinal })
      const escala = PREVIEW_MAX / natural.width
      const viewport = page.getViewport({ scale: escala, rotation: rotationFinal })

      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      renderRef.current?.cancel()
      const task = page.render({ canvasContext: ctx, viewport, canvas })
      renderRef.current = task
      await task.promise
      renderRef.current = null
      return null
    } catch (e) {
      // Cancelar un render en curso es parte del flujo al girar rápido.
      if ((e as { name?: string })?.name === "RenderingCancelledException") return null
      return (e as Error).message
    }
  }, [rotacion])

  useEffect(() => {
    if (cargando) return
    let vigente = true
    dibujar().then((err) => { if (vigente && err) setError(err) })
    return () => { vigente = false }
  }, [cargando, dibujar])

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Previsualización — así se va a guardar
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs tabular-nums text-muted-foreground mr-1">{rotacion}°</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || cargando}
            onClick={() => onRotacionChange(girar(rotacion, -90))}
            title="Girar a la izquierda"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || cargando}
            onClick={() => onRotacionChange(girar(rotacion, 90))}
            title="Girar a la derecha"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-30 items-center justify-center bg-neutral-100 rounded p-2">
        {cargando && <p className="text-xs text-muted-foreground">Cargando PDF…</p>}
        {error && <p className="text-xs text-destructive">No se pudo previsualizar: {error}</p>}
        {!cargando && !error && <canvas ref={canvasRef} className="bg-white shadow-sm" />}
      </div>

      {rotacion !== 0 && (
        <p className="text-xs text-muted-foreground">
          El PDF se va a guardar girado {rotacion}°. Afecta al archivo, no sólo a la vista.
        </p>
      )}
    </div>
  )
}
