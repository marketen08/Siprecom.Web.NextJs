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
  /**
   * Callback al terminar el drag de un pin existente. El PidViewer solo mueve el
   * pin visualmente (feedback) — la persistencia es responsabilidad del caller.
   */
  onPinMove?: (pin: PidPendientePin, coord: { x: number; y: number }) => void
  /**
   * Gate opcional. Si devuelve false, no se activa el long-press → drag para
   * ese pin (el user no puede moverlo por permisos o estado terminal).
   * Default: true para todos.
   */
  puedeMoverPin?: (pin: PidPendientePin) => boolean
  /**
   * Id del pendiente que está actualmente abierto en el sheet. Ese pin se pinta
   * con un halo pulsante + flecha para ubicar visualmente cuál es.
   */
  focusedPinId?: string | null
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
const LONG_PRESS_MS = 450
const LONG_PRESS_MOVE_CANCEL_PX = 8

export function PidViewer({
  pidArchivoId,
  totalPaginas,
  page,
  onPageChange,
  pines,
  modoCrearPin,
  onCrearPin,
  onPinClick,
  onPinMove,
  puedeMoverPin,
  focusedPinId,
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

  // Estado de drag de un pin (long-press + arrastre). Cuando `draggingPinId` es
  // no-null, el pin se pinta en `draggedCoord` en vez de sus coord persistidas.
  // `draggingPointerId` guarda el pointer que originó el drag para que sólo ese
  // dedo/mouse mueva y suelte el pin.
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null)
  const [draggedCoord, setDraggedCoord] = useState<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draggingPointerIdRef = useRef<number | null>(null)
  const draggingPinRef = useRef<PidPendientePin | null>(null)
  const pinPressStartRef = useRef<{ x: number; y: number } | null>(null)

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

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

  // Wheel para desktop: zoom in/out. React monta `onWheel` como *passive* por
  // default en varios browsers, y `preventDefault()` sobre passive tira el
  // warning "Unable to preventDefault inside passive event listener invocation".
  // Enganchamos el listener a mano con { passive: false } para poder frenar el
  // scroll del contenedor mientras el usuario hace zoom.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const handleWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const factor = ev.deltaY < 0 ? 1.1 : 0.9
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor))
      setScale(next)
    }
    wrap.addEventListener("wheel", handleWheel, { passive: false })
    return () => wrap.removeEventListener("wheel", handleWheel)
  }, [])

  const zoomIn  = () => setScale((s) => Math.min(MAX_SCALE, s * 1.25))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / 1.25))
  const zoomReset = () => { setScale(1); setTx(0); setTy(0) }

  // ─── Long-press + drag del pin ────────────────────────────────────────────
  // El flujo: pointerdown sobre el pin arma un timer 450ms. Si el usuario no
  // suelta ni se mueve más de 8px en ese lapso, entramos en modo drag: cada
  // pointermove actualiza `draggedCoord`, y en pointerup persistimos via
  // `onPinMove` y salimos del modo. Si suelta antes del threshold, tratamos
  // como click (abrir detalle).

  const onPinPointerDown = useCallback((ev: React.PointerEvent, pin: PidPendientePin) => {
    ev.stopPropagation() // no propagar al viewer (sino se mete en el pan)
    // Siempre capturamos y trackeamos el pointer, aunque el pin no sea drageable —
    // sino el pointerup nunca sabe que es "el mismo" pointer y no dispara el
    // click (bug de "no se abre el detalle en pines cerrados").
    ;(ev.target as HTMLElement).setPointerCapture(ev.pointerId)
    draggingPointerIdRef.current = ev.pointerId
    draggingPinRef.current = pin
    pinPressStartRef.current = { x: ev.clientX, y: ev.clientY }
    cancelLongPress()

    // Long-press / Shift-drag solo si el caller habilitó mover y el gate lo permite.
    const canDrag = !!onPinMove && (!puedeMoverPin || puedeMoverPin(pin))
    if (!canDrag) return

    // Atajo desktop: Shift+drag entra en modo drag inmediato, sin esperar el
    // long-press. Rápido para mouse; touch usa siempre long-press (no hay Shift).
    if (ev.shiftKey) {
      setDraggingPinId(pin.id)
      setDraggedCoord({ x: pin.coordX, y: pin.coordY })
      return
    }

    longPressTimerRef.current = setTimeout(() => {
      // Long-press cumplido: entrar en modo drag.
      setDraggingPinId(pin.id)
      // Al iniciar, mantenemos las coord actuales del pin.
      setDraggedCoord({ x: pin.coordX, y: pin.coordY })
      // Feedback háptico si el device lo soporta (tablets Android sí).
      try { navigator.vibrate?.(30) } catch { /* noop */ }
    }, LONG_PRESS_MS)
  }, [cancelLongPress, onPinMove, puedeMoverPin])

  const onPinPointerMove = useCallback((ev: React.PointerEvent) => {
    if (draggingPointerIdRef.current !== ev.pointerId) return
    // Antes del threshold del long-press: si se mueve mucho, cancelar (fue un swipe).
    if (draggingPinId == null && pinPressStartRef.current) {
      const dx = ev.clientX - pinPressStartRef.current.x
      const dy = ev.clientY - pinPressStartRef.current.y
      if (Math.abs(dx) > LONG_PRESS_MOVE_CANCEL_PX || Math.abs(dy) > LONG_PRESS_MOVE_CANCEL_PX) {
        cancelLongPress()
      }
      return
    }
    // Ya en modo drag: mapear a coordenadas normalizadas del canvas.
    const canvas = canvasRef.current
    if (!canvas) return
    const coord = pointerToNormalized({ clientX: ev.clientX, clientY: ev.clientY }, canvas)
    if (coord) setDraggedCoord(coord)
  }, [draggingPinId, cancelLongPress])

  const onPinPointerUp = useCallback((ev: React.PointerEvent, pin: PidPendientePin) => {
    ev.stopPropagation()
    if (draggingPointerIdRef.current !== ev.pointerId) return
    const wasDragging = draggingPinId === pin.id && draggedCoord != null
    cancelLongPress()
    draggingPointerIdRef.current = null
    draggingPinRef.current = null
    pinPressStartRef.current = null
    if (wasDragging) {
      const finalCoord = draggedCoord!
      setDraggingPinId(null)
      setDraggedCoord(null)
      onPinMove?.(pin, finalCoord)
    } else {
      // Fue un click corto → abrir detalle.
      onPinClick(pin)
    }
  }, [draggingPinId, draggedCoord, cancelLongPress, onPinClick, onPinMove])

  const onPinPointerCancel = useCallback((ev: React.PointerEvent) => {
    if (draggingPointerIdRef.current !== ev.pointerId) return
    cancelLongPress()
    draggingPointerIdRef.current = null
    draggingPinRef.current = null
    pinPressStartRef.current = null
    setDraggingPinId(null)
    setDraggedCoord(null)
  }, [cancelLongPress])

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
            .map((pin) => {
              const isDragging = draggingPinId === pin.id
              const isFocused = focusedPinId === pin.id
              const coordX = isDragging && draggedCoord ? draggedCoord.x : pin.coordX
              const coordY = isDragging && draggedCoord ? draggedCoord.y : pin.coordY
              return (
                <div
                  key={pin.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${coordX * 100}%`,
                    top: `${coordY * 100}%`,
                    // z-index alto en el pin focused para que la flecha/halo
                    // no queden tapados por otros pines cercanos.
                    zIndex: isFocused ? 20 : isDragging ? 10 : 1,
                  }}
                >
                  {/* Flecha apuntando al pin (visible sólo si es el focused). Se
                      posiciona arriba de la punta del pin y "cae" con animación. */}
                  {isFocused && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce"
                      style={{ bottom: 8, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.4))" }}
                    >
                      <div className="rounded-md bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                        {pin.codigoFormateado}
                      </div>
                      <ChevronDownIcon />
                    </div>
                  )}

                  {/* Halo pulsante (ping) — sólo si es el focused. Es un círculo
                      absolute que se expande y desvanece en loop. */}
                  {isFocused && (
                    <span
                      className="absolute -translate-x-1/2 -translate-y-full rounded-full animate-ping"
                      style={{
                        left: 0,
                        top: 0,
                        width: 24,
                        height: 24,
                        backgroundColor: colorPorEstado(pin.estadoId),
                        opacity: 0.6,
                      }}
                    />
                  )}

                  <button
                    type="button"
                    className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-full rounded-full border-2 shadow-md cursor-pointer transition-transform ${
                      isDragging
                        ? "scale-150 ring-4 ring-white/70"
                        : isFocused
                          ? "scale-125 border-blue-600 ring-2 ring-blue-400"
                          : "border-white active:scale-110"
                    }`}
                    style={{
                      left: 0,
                      top: 0,
                      width: 24,
                      height: 24,
                      backgroundColor: colorPorEstado(pin.estadoId),
                      touchAction: "none",
                    }}
                    title={`${pin.codigoFormateado} · ${pin.estadoNombre} — ${pin.categoriaNombre}${
                      onPinMove ? " (mantené presionado, o Shift+arrastrar en PC, para mover)" : ""
                    }`}
                    onPointerDown={(e) => onPinPointerDown(e, pin)}
                    onPointerMove={onPinPointerMove}
                    onPointerUp={(e) => onPinPointerUp(e, pin)}
                    onPointerCancel={onPinPointerCancel}
                    // El click nativo lo suprimimos: la lógica está en onPointerUp
                    // (distingue tap corto vs drag).
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-bold text-white block leading-none">
                      {pin.codigo}
                    </span>
                  </button>
                </div>
              )
            })}
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

// Chevron SVG inline — pequeño, sin dep de lucide para mantener el visor
// autocontenido. Apunta hacia abajo, hacia la punta del pin.
function ChevronDownIcon() {
  return (
    <svg
      width="20"
      height="12"
      viewBox="0 0 20 12"
      fill="currentColor"
      className="text-blue-600"
      aria-hidden
    >
      <path d="M10 12 L0 0 L20 0 Z" />
    </svg>
  )
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
