"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchPidDownloadUrl } from "../api/use-mutate-pids"
import {
  loadPdfjs,
  renderPage,
  renderRegion,
  pointerToNormalized,
  dist,
  isRenderCancelledError,
  type RenderHandle,
  type RegionRenderHandle,
} from "../lib/pid-viewer-lib"
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

// ─── Capa de alta resolución ────────────────────────────────────────────────
// El canvas base se rasteriza una sola vez a fit-scale × DPR y el zoom es puro
// transform CSS, así que a partir de cierto acercamiento se ven píxeles
// estirados. Esta capa re-renderiza con pdfjs SOLO la región visible, a la
// densidad que pide el zoom, y se superpone al base. El base nunca se borra:
// si este render falla, se cancela o tarda, lo que se ve es lo de siempre.
//
// Debajo de este zoom no vale la pena: el base ya alcanza.
const HIRES_MIN_ZOOM = 1.5
// Se dispara al terminar el gesto, no durante. El pan/zoom siguen siendo CSS
// (instantáneos) — esta capa sólo agrega nitidez cuando el usuario se detiene.
const HIRES_DEBOUNCE_MS = 200
// Margen extra alrededor del viewport, para que un pan corto no deje bordes
// sin capa nítida mientras se recalcula.
const HIRES_MARGIN = 0.12
// Techo de píxeles del canvas de alta resolución (~48 MB a 4 bytes/px). Por
// debajo del límite de área de canvas de iOS Safari (~16.7 M) con margen.
const HIRES_MAX_PIXELS = 12_000_000

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
  // Capa nítida: wrapper (lleva el mismo transform que el canvas base, así el
  // canvas hijo se posiciona en coordenadas del base) + canvas superpuesto.
  const hiresWrapRef = useRef<HTMLDivElement | null>(null)
  const hiresCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hiresRenderRef = useRef<RegionRenderHandle | null>(null)
  /** Tamaño CSS del canvas base — sistema de referencia de la región visible. */
  const baseSizeRef = useRef<{ w: number; h: number } | null>(null)

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

  /**
   * Baja la capa nítida y cancela el render en vuelo. Dejar de pintarla es
   * seguro en cualquier momento: abajo está el canvas base, que es el
   * comportamiento previo a esta capa.
   */
  const ocultarHires = useCallback(() => {
    hiresRenderRef.current?.cancel()
    hiresRenderRef.current = null
    const c = hiresCanvasRef.current
    if (c) c.style.display = "none"
  }, [])

  // ─── 2) Render de la página actual ───────────────────────────────────────
  // pdfjs no permite dos `page.render()` simultáneos sobre el mismo canvas.
  // Guardamos el handle del render en curso y lo cancelamos antes de iniciar
  // uno nuevo — sino al hacer resize/rotar aparece "Cannot use the same canvas
  // during multiple render() operations".
  const currentRenderRef = useRef<RenderHandle | null>(null)
  const renderCurrentPage = useCallback(async () => {
    const doc = docRef.current
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!doc || !wrap || !canvas) return
    const rect = wrap.getBoundingClientRect()
    if (rect.width < 10 || rect.height < 10) return

    // Cancelar el render anterior si sigue en curso.
    currentRenderRef.current?.cancel()

    // Invalidar el sistema de referencia mientras el base se rehace: si entra
    // un render de la capa nítida en el medio (debounce que vence antes de que
    // termine éste), calcularía la región contra el tamaño de la página vieja.
    baseSizeRef.current = null
    ocultarHires()

    const handle = renderPage(doc, page, canvas, rect.width, rect.height)
    currentRenderRef.current = handle
    try {
      const { widthPx, heightPx } = await handle.promise
      if (currentRenderRef.current !== handle) return // reemplazado por otro render
      currentRenderRef.current = null
      if (overlayRef.current) {
        overlayRef.current.style.width = `${widthPx}px`
        overlayRef.current.style.height = `${heightPx}px`
      }
      // El base cambió (otra página u otro tamaño) ⇒ la capa nítida que había
      // quedó obsoleta. La ocultamos; el efecto de zoom la vuelve a pedir si
      // corresponde. Guardamos además el tamaño CSS del base, que es el
      // sistema de coordenadas en el que se expresa la región visible.
      baseSizeRef.current = { w: widthPx, h: heightPx }
      ocultarHires()
      // Reset de transform al cambiar de página / reload — evita quedar
      // desencuadrado si la página anterior tenía otra proporción.
      setScale(1); setTx(0); setTy(0)
      // Limpiamos error previo si el render actual salió bien.
      setDocError(null)
    } catch (e) {
      // Cancelaciones son parte del flujo normal (resize rápido) — no las
      // reportamos como error al usuario.
      if (isRenderCancelledError(e)) return
      if (currentRenderRef.current === handle) currentRenderRef.current = null
      setDocError((e as Error).message)
    }
  }, [page, ocultarHires])

  useEffect(() => {
    if (docLoading) return
    void renderCurrentPage()
    // Cancelar el render en curso al desmontar / cambiar deps.
    return () => currentRenderRef.current?.cancel()
  }, [docLoading, renderCurrentPage])

  // Re-render en resize del contenedor (cambio de orientación / abrir panels).
  // Debounce ~120ms para no disparar N renders durante un drag del sidebar o
  // durante la animación de rotación del device.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void renderCurrentPage() }, 120)
    })
    ro.observe(wrap)
    return () => {
      if (timer) clearTimeout(timer)
      ro.disconnect()
    }
  }, [renderCurrentPage])

  // ─── 3) Gestos (pointer events) ──────────────────────────────────────────
  const applyTransform = useCallback(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    const hires = hiresWrapRef.current
    const t = `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`
    if (canvas) canvas.style.transform = t
    if (overlay) overlay.style.transform = t
    // La capa nítida viaja con el mismo transform: mientras no se recalcule,
    // sigue alineada al plano y simplemente deja de cubrir lo que entró en
    // viewport después del gesto (ahí abajo se ve el base).
    if (hires) hires.style.transform = t
  }, [])
  useEffect(() => { applyTransform() }, [scale, tx, ty, applyTransform])

  // ─── 3b) Capa nítida sobre la región visible ──────────────────────────────
  // Depende del zoom/pan pero NO corre durante el gesto: el debounce espera a
  // que el usuario se detenga. Así el pan/zoom siguen costando lo mismo que
  // antes (puro transform CSS) y el trabajo pesado ocurre una vez por gesto —
  // que es lo que importa en PID vectoriales de CAD, donde cada render recorre
  // una lista de operadores de decenas de miles de paths.
  const renderHires = useCallback(async () => {
    const doc = docRef.current
    const wrap = wrapRef.current
    const canvas = hiresCanvasRef.current
    const base = baseSizeRef.current
    if (!doc || !wrap || !canvas || !base) return

    const s = scaleRef.current
    if (s < HIRES_MIN_ZOOM) { ocultarHires(); return }

    const wr = wrap.getBoundingClientRect()
    if (wr.width < 10 || wr.height < 10) return

    // Región visible, pasada a coordenadas del canvas base (pre-transform) y
    // recortada a los límites del plano.
    const margenX = (wr.width / s) * HIRES_MARGIN
    const margenY = (wr.height / s) * HIRES_MARGIN
    const x0 = Math.max(0, -txRef.current / s - margenX)
    const y0 = Math.max(0, -tyRef.current / s - margenY)
    const x1 = Math.min(base.w, (wr.width - txRef.current) / s + margenX)
    const y1 = Math.min(base.h, (wr.height - tyRef.current) / s + margenY)
    if (x1 - x0 < 1 || y1 - y0 < 1) { ocultarHires(); return }

    hiresRenderRef.current?.cancel()
    const handle = renderRegion(doc, page, canvas, {
      x0, y0, x1, y1,
      baseCssWidth: base.w,
      zoom: s,
      maxPixels: HIRES_MAX_PIXELS,
    })
    hiresRenderRef.current = handle
    try {
      const { widthPx, heightPx, densidad, ms } = await handle.promise
      if (hiresRenderRef.current !== handle) return // lo reemplazó otro gesto
      hiresRenderRef.current = null
      canvas.style.left = `${x0}px`
      canvas.style.top = `${y0}px`
      canvas.style.width = `${x1 - x0}px`
      canvas.style.height = `${y1 - y0}px`
      canvas.style.display = "block"
      // Instrumentación para comparar el costo entre un PID escaneado y uno
      // vectorial: si el vectorial supera ~500ms conviene revisar el cap o
      // evaluar un esquema de tiles.
      console.debug(
        `[pid-hires] ${widthPx}×${heightPx}px ` +
        `(${((widthPx * heightPx) / 1e6).toFixed(1)} Mpx) ` +
        `densidad=${densidad.toFixed(2)} zoom=${s.toFixed(2)} ${ms.toFixed(0)}ms`,
      )
    } catch (e) {
      if (isRenderCancelledError(e)) return
      if (hiresRenderRef.current === handle) hiresRenderRef.current = null
      // Nunca propagamos a `docError`: esta capa es opcional y el canvas base
      // sigue en pantalla. Sólo dejamos rastro para diagnóstico.
      console.debug("[pid-hires] render falló:", (e as Error).message)
    }
  }, [page, ocultarHires])

  useEffect(() => {
    if (docLoading) return
    // Bajar del umbral se aplica al instante; subir espera el debounce.
    if (scale < HIRES_MIN_ZOOM) { ocultarHires(); return }
    const timer = setTimeout(() => { void renderHires() }, HIRES_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [scale, tx, ty, docLoading, renderHires, ocultarHires])

  // Cancelar el render de la capa nítida al desmontar.
  useEffect(() => () => { hiresRenderRef.current?.cancel() }, [])

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
        {/* Capa nítida: re-render de la región visible a la densidad que pide
            el zoom. Va entre el canvas base y el overlay — tapa al base, nunca
            a los pines. El wrapper lleva el mismo transform que el base, así
            el canvas hijo se posiciona en coordenadas del base. */}
        <div
          ref={hiresWrapRef}
          className="absolute top-0 left-0 origin-top-left pointer-events-none"
          style={{ transform: "translate(0,0) scale(1)" }}
        >
          {/* `bg-white`: pdfjs deja transparente lo que no dibuja, y sin fondo
              opaco se vería asomar el trazo borroso del base alrededor de cada
              línea. Sólo se muestra con el render ya resuelto, así que nunca
              tapa el plano con un rectángulo en blanco. */}
          <canvas ref={hiresCanvasRef} className="absolute bg-white" style={{ display: "none" }} />
        </div>
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

      {/* Toolbar flotante — tap targets 44px en touch (Apple HIG), 32px en
          desktop. Respeta safe-area-inset-bottom del device (iPhone con home
          indicator). */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/75 text-white shadow-lg backdrop-blur px-2 py-1.5"
        style={{
          bottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <button
          type="button"
          onClick={zoomOut}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-full hover:bg-white/10 active:bg-white/20 cursor-pointer text-xl sm:text-lg leading-none flex items-center justify-center"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          onClick={zoomReset}
          className="min-w-12 px-2 py-1 rounded-full hover:bg-white/10 active:bg-white/20 cursor-pointer text-xs tabular-nums"
          title="Ajustar al viewport"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-full hover:bg-white/10 active:bg-white/20 cursor-pointer text-xl sm:text-lg leading-none flex items-center justify-center"
          aria-label="Acercar"
        >
          +
        </button>

        {totalPaginas > 1 && (
          <>
            <span className="w-px h-5 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-full hover:bg-white/10 active:bg-white/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xl sm:text-lg leading-none flex items-center justify-center"
              aria-label="Página anterior"
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
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-full hover:bg-white/10 active:bg-white/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xl sm:text-lg leading-none flex items-center justify-center"
              aria-label="Página siguiente"
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
