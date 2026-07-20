"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchPidDownloadUrl } from "../api/use-mutate-pids"
import { loadPdfjs, renderPage, pointerToNormalized, dist } from "../lib/pid-viewer-lib"
import type { PidPendientePin } from "../types"

interface PidViewerProps {
  pidArchivoId: string
  totalPaginas: number
  page: number
  onPageChange: (p: number) => void
  /** Pines existentes a dibujar sobre la página actual. */
  pines: PidPendientePin[]
  /** Modo "crear pin" activo — un tap sobre el plano dispara `onCrearPin`. */
  modoCrearPin: boolean
  onCrearPin: (coord: { x: number; y: number }) => void
  onPinClick: (pin: PidPendientePin) => void
}

interface PointerState {
  id: number
  clientX: number
  clientY: number
  startX: number
  startY: number
  moved: boolean
}

const MIN_SCALE = 0.5
const MAX_SCALE = 8
const TAP_MOVE_THRESHOLD_PX = 6

export function PidViewer({
  pidArchivoId,
  totalPaginas,
  page,
  onPageChange,
  pines,
  modoCrearPin,
  onCrearPin,
  onPinClick,
}: PidViewerProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const [docLoading, setDocLoading] = useState(true)
  const [docError, setDocError] = useState<string | null>(null)
  const docRef = useRef<any>(null)

  // Zoom/pan: transformación aplicada al contenedor {canvas, overlay}.
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const scaleRef = useRef(1)
  const txRef = useRef(0)
  const tyRef = useRef(0)
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { txRef.current = tx }, [tx])
  useEffect(() => { tyRef.current = ty }, [ty])

  // Pointers activos (para pinch/pan/tap).
  const pointersRef = useRef<Map<number, PointerState>>(new Map())
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)

  // ─── 1) Cargar el PDF (SAS URL → pdfjs) ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setDocLoading(true)
    setDocError(null)
    docRef.current?.destroy?.()
    docRef.current = null
    ;(async () => {
      try {
        const { url } = await fetchPidDownloadUrl(pidArchivoId)
        const pdfjs = await loadPdfjs()
        if (cancelled) return
        const task = pdfjs.getDocument({ url })
        const doc = await task.promise
        if (cancelled) { doc.destroy(); return }
        docRef.current = doc
        setDocLoading(false)
      } catch (e) {
        if (!cancelled) {
          setDocError((e as Error).message)
          setDocLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      docRef.current?.destroy?.()
      docRef.current = null
    }
  }, [pidArchivoId])

  // ─── 2) Render de la página actual ───────────────────────────────────────
  const renderCurrentPage = useCallback(async () => {
    const doc = docRef.current
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!doc || !wrap || !canvas) return
    const rect = wrap.getBoundingClientRect()
    if (rect.width < 10 || rect.height < 10) return
    try {
      const { widthPx, heightPx } = await renderPage(doc, page, canvas, rect.width, rect.height)
      if (overlayRef.current) {
        overlayRef.current.style.width = `${widthPx}px`
        overlayRef.current.style.height = `${heightPx}px`
      }
      // Reset de transform al cambiar de página / reload — evita quedar
      // desencuadrado si la página anterior tenía otra proporción.
      setScale(1); setTx(0); setTy(0)
    } catch (e) {
      setDocError((e as Error).message)
    }
  }, [page])

  useEffect(() => {
    if (docLoading) return
    void renderCurrentPage()
  }, [docLoading, renderCurrentPage])

  // Re-render en resize del contenedor (cambio de orientación / abrir panels).
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => { void renderCurrentPage() })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [renderCurrentPage])

  // ─── 3) Gestos (pointer events) ──────────────────────────────────────────
  const applyTransform = useCallback(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    const t = `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`
    if (canvas) canvas.style.transform = t
    if (overlay) overlay.style.transform = t
  }, [])
  useEffect(() => { applyTransform() }, [scale, tx, ty, applyTransform])

  const clampPan = useCallback((newTx: number, newTy: number, newScale: number) => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return { tx: newTx, ty: newTy }
    const wr = wrap.getBoundingClientRect()
    const cw = parseFloat(canvas.style.width || "0")
    const ch = parseFloat(canvas.style.height || "0")
    // Rango de pan: mantener al menos 50% del canvas dentro del viewport.
    const maxTx = Math.max(0, (cw * newScale) / 2)
    const maxTy = Math.max(0, (ch * newScale) / 2)
    const minTx = wr.width - (cw * newScale) - -maxTx / 1
    // Simplificamos: dejar libre pero acotado a ±2× ancho.
    return {
      tx: Math.max(-cw * newScale, Math.min(wr.width, newTx)),
      ty: Math.max(-ch * newScale, Math.min(wr.height, newTy)),
    }
    void minTx
  }, [])

  const onPointerDown = useCallback((ev: React.PointerEvent) => {
    ;(ev.target as HTMLElement).setPointerCapture(ev.pointerId)
    const p: PointerState = {
      id: ev.pointerId,
      clientX: ev.clientX,
      clientY: ev.clientY,
      startX: ev.clientX,
      startY: ev.clientY,
      moved: false,
    }
    pointersRef.current.set(ev.pointerId, p)
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values())
      pinchStartDistRef.current = dist(pt(a), pt(b))
      pinchStartScaleRef.current = scaleRef.current
    }
  }, [])

  const onPointerMove = useCallback((ev: React.PointerEvent) => {
    const p = pointersRef.current.get(ev.pointerId)
    if (!p) return
    const dx = ev.clientX - p.clientX
    const dy = ev.clientY - p.clientY
    if (Math.abs(ev.clientX - p.startX) > TAP_MOVE_THRESHOLD_PX ||
        Math.abs(ev.clientY - p.startY) > TAP_MOVE_THRESHOLD_PX) {
      p.moved = true
    }
    p.clientX = ev.clientX
    p.clientY = ev.clientY

    if (pointersRef.current.size === 2 && pinchStartDistRef.current != null) {
      // Pinch zoom entre los 2 pointers.
      const [a, b] = Array.from(pointersRef.current.values())
      const d = dist(pt(a), pt(b))
      const factor = d / pinchStartDistRef.current
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScaleRef.current * factor))
      setScale(next)
      // Marcar ambos como "moved" para que no dispare tap al soltar.
      a.moved = true; b.moved = true
    } else if (pointersRef.current.size === 1) {
      // Pan.
      setTx((v) => v + dx)
      setTy((v) => v + dy)
    }
  }, [])

  const onPointerUp = useCallback((ev: React.PointerEvent) => {
    const p = pointersRef.current.get(ev.pointerId)
    pointersRef.current.delete(ev.pointerId)
    pinchStartDistRef.current = null
    if (!p) return

    // Tap sin movimiento sobre el canvas: crear pin si el modo está activo.
    if (!p.moved && pointersRef.current.size === 0) {
      const canvas = canvasRef.current
      if (!canvas) return
      const coord = pointerToNormalized({ clientX: ev.clientX, clientY: ev.clientY }, canvas)
      if (coord && modoCrearPin) {
        onCrearPin(coord)
      }
    }
  }, [modoCrearPin, onCrearPin])

  // Wheel para desktop: zoom in/out centrado en el cursor.
  const onWheel = useCallback((ev: React.WheelEvent) => {
    if (!ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
      // Zoom "natural" con wheel; el usuario en desktop lo espera.
    }
    ev.preventDefault()
    const factor = ev.deltaY < 0 ? 1.1 : 0.9
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor))
    setScale(next)
  }, [])

  const zoomIn  = () => setScale((s) => Math.min(MAX_SCALE, s * 1.25))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / 1.25))
  const zoomReset = () => { setScale(1); setTx(0); setTy(0) }

  // ─── 4) Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative flex-1 min-h-0 bg-neutral-900 overflow-hidden">
      {/* Viewport */}
      <div
        ref={wrapRef}
        className="absolute inset-0 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: modoCrearPin ? "crosshair" : "grab" }}
      >
        {/* Canvas del PDF (transform-origin top-left para que pan/zoom sean predecibles) */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 origin-top-left bg-white shadow-lg"
          style={{ transform: "translate(0,0) scale(1)" }}
        />
        {/* Overlay de pins (mismo transform que el canvas) */}
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 origin-top-left pointer-events-none"
          style={{ transform: "translate(0,0) scale(1)" }}
        >
          {pines
            .filter((p) => p.pagina === page)
            .map((pin) => (
              <button
                key={pin.id}
                type="button"
                className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full rounded-full border-2 border-white shadow-md cursor-pointer active:scale-110 transition-transform"
                style={{
                  left: `${pin.coordX * 100}%`,
                  top: `${pin.coordY * 100}%`,
                  width: 24,
                  height: 24,
                  backgroundColor: colorPorEstado(pin.estadoId),
                }}
                title={`${pin.codigoFormateado} · ${pin.estadoNombre} — ${pin.categoriaNombre}`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onPinClick(pin) }}
              >
                <span className="text-[10px] font-bold text-white block leading-none">
                  {pin.codigo}
                </span>
              </button>
            ))}
        </div>

        {/* Loading / error overlay */}
        {docLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
            Cargando PID…
          </div>
        )}
        {docError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-300 text-sm p-4 text-center">
            No se pudo cargar el PID: {docError}
          </div>
        )}
      </div>

      {/* Toolbar flotante */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 text-white text-sm px-3 py-1.5 shadow-lg backdrop-blur">
        <button type="button" onClick={zoomOut} className="w-8 h-8 rounded hover:bg-white/10 cursor-pointer text-lg leading-none">−</button>
        <button type="button" onClick={zoomReset} className="px-2 rounded hover:bg-white/10 cursor-pointer text-xs">
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={zoomIn} className="w-8 h-8 rounded hover:bg-white/10 cursor-pointer text-lg leading-none">+</button>

        {totalPaginas > 1 && (
          <>
            <span className="w-px h-4 bg-white/20 mx-1" />
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-40 cursor-pointer text-lg leading-none"
            >
              ‹
            </button>
            <span className="px-2 text-xs tabular-nums">
              {page} / {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPaginas, page + 1))}
              disabled={page === totalPaginas}
              className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-40 cursor-pointer text-lg leading-none"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function pt(p: PointerState): { x: number; y: number } {
  return { x: p.clientX, y: p.clientY }
}

function colorPorEstado(estadoId: string): string {
  switch (estadoId) {
    case "estado-pend-abierto":              return "#ef4444" // red-500
    case "estado-pend-en-proceso":           return "#f59e0b" // amber-500
    case "estado-pend-aprobacion":           return "#3b82f6" // blue-500
    case "estado-pend-cerrado":              return "#10b981" // emerald-500
    case "estado-pend-cancelado":            return "#6b7280" // gray-500
    default:                                 return "#a855f7" // purple fallback
  }
}
