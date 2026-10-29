// Helpers para el visor PID. Import dinámico de pdfjs-dist para evitar SSR y
// mantener el bundle inicial chico.

let pdfjsPromise: Promise<any> | null = null

/**
 * Carga pdfjs-dist una única vez y le setea el workerSrc — patrón replicado
 * de features/registros/lib/read-qr.ts.
 */
export function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString()
      return pdfjs
    })()
  }
  return pdfjsPromise
}

/**
 * Handle de un render en curso — permite cancelarlo si se dispara otro (por
 * ejemplo cuando el user redimensiona la ventana y ResizeObserver dispara un
 * nuevo render antes de que termine el anterior). pdfjs no permite dos
 * `page.render()` simultáneos sobre el mismo canvas.
 */
export interface RenderHandle {
  promise: Promise<{ widthPx: number; heightPx: number }>
  cancel: () => void
}

/**
 * Excepción que tira pdfjs cuando cancelamos un render en curso. La
 * capturamos en el caller para no confundirla con un error real.
 */
export function isRenderCancelledError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? ""
  return name === "RenderingCancelledException"
}

/**
 * Renderiza una página del PDF a un `<canvas>` dado, escalando para que quepa
 * dentro del `maxWidth`. Devuelve un handle con la promise + una función para
 * cancelar. El caller es responsable de cancelar el render anterior antes de
 * iniciar uno nuevo (sino pdfjs tira "Cannot use the same canvas during
 * multiple render() operations").
 */
export function renderPage(
  doc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
): RenderHandle {
  let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
  let cancelledBeforeStart = false

  const promise = (async () => {
    const page = await doc.getPage(pageNumber)
    if (cancelledBeforeStart) {
      const err = new Error("cancelled")
      ;(err as { name: string }).name = "RenderingCancelledException"
      throw err
    }
    const naturalViewport = page.getViewport({ scale: 1 })
    const fitScale = Math.min(maxWidth / naturalViewport.width, maxHeight / naturalViewport.height)
    // Multiplicador por DPR: la mayoría de las tablets tienen dpr >= 2 y con
    // fitScale a 1x se ve borroso. Cap en 2 — a más el costo de memoria/tiempo
    // sube exponencial (planos PID grandes pueden alcanzar 8000×5000 px a 2x).
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = page.getViewport({ scale: fitScale * dpr })

    canvas.width = viewport.width
    canvas.height = viewport.height
    const cssW = viewport.width / dpr
    const cssH = viewport.height / dpr
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    renderTask = page.render({ canvasContext: ctx, viewport, canvas })
    await renderTask!.promise
    renderTask = null
    return { widthPx: cssW, heightPx: cssH }
  })()

  return {
    promise,
    cancel: () => {
      cancelledBeforeStart = true
      if (renderTask) {
        try { renderTask.cancel() } catch { /* pdfjs lanza al llamar cancel si el
          render ya terminó — swallear es aceptable acá. */ }
        renderTask = null
      }
    },
  }
}

/**
 * Parámetros de un render de alta resolución acotado a la región visible.
 *
 * El sistema de coordenadas de referencia es el del canvas base en px CSS
 * (es decir, pre-transform): el canvas base mide `baseCssWidth × baseCssHeight`
 * y el zoom/pan se le aplica por CSS. La región se expresa en ese sistema, que
 * es el mismo en el que vive el overlay de pines.
 */
export interface RegionParams {
  /** Esquina sup-izq de la región, en px CSS del canvas base. */
  x0: number
  y0: number
  /** Esquina inf-der de la región, en px CSS del canvas base. */
  x1: number
  y1: number
  /** Ancho CSS del canvas base — fija la relación con el viewport natural. */
  baseCssWidth: number
  /** Zoom actual (el `scale` del transform CSS). */
  zoom: number
  /** Techo de píxeles del canvas de alta resolución (ver HIRES_MAX_PIXELS). */
  maxPixels: number
}

/**
 * Superficie mínima de pdfjs que usa `renderRegion`. El resto del archivo
 * tipa el doc como `any` por el import dinámico; acá declaramos sólo lo que
 * tocamos, que además documenta la API de la que dependemos.
 */
interface PdfViewportLike {
  width: number
  height: number
}
interface PdfPageLike {
  getViewport(params: { scale: number }): PdfViewportLike
  render(params: {
    canvasContext: CanvasRenderingContext2D
    viewport: PdfViewportLike
    transform?: number[]
    canvas?: HTMLCanvasElement
  }): { cancel: () => void; promise: Promise<void> }
}
interface PdfDocLike {
  getPage(pageNumber: number): Promise<PdfPageLike>
}

export interface RegionRenderHandle {
  /** Resuelve con la métrica del render — la usamos para instrumentar costo. */
  promise: Promise<{ widthPx: number; heightPx: number; densidad: number; ms: number }>
  cancel: () => void
}

/**
 * Renderiza SOLO la región visible de una página a un canvas aparte, a la
 * densidad que exige el zoom actual. Es la "capa nítida" que se superpone al
 * canvas base: el base se rasteriza una vez a fit-scale y nunca se borra, así
 * que si este render falla, se cancela o lo recorta el cap, lo que queda a la
 * vista es exactamente el comportamiento previo a esta capa.
 *
 * Por qué por región y no re-renderizando la página entera: a zoom 8 un A1
 * completo pide ~280 M píxeles, muy por encima del límite de canvas de
 * cualquier browser. Acotado al viewport son ~6 M, dos órdenes de magnitud
 * menos. Y a diferencia de un esquema de tiles, ejecuta la lista de operadores
 * de pdfjs UNA sola vez por gesto — que es lo que importa en los PID
 * vectoriales de CAD, donde esa lista tiene decenas de miles de paths.
 */
export function renderRegion(
  doc: PdfDocLike,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  p: RegionParams,
): RegionRenderHandle {
  let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
  let cancelledBeforeStart = false

  const promise = (async () => {
    const t0 = performance.now()
    const page = await doc.getPage(pageNumber)
    if (cancelledBeforeStart) throw cancelledError()

    const natural = page.getViewport({ scale: 1 })
    // Escala a la que se rasterizó el canvas base (sin el factor DPR).
    const fitScale = p.baseCssWidth / natural.width

    const regionW = p.x1 - p.x0
    const regionH = p.y1 - p.y0
    if (regionW <= 0 || regionH <= 0) throw new Error("Región visible vacía.")

    // Densidad objetivo: tantos px de device por px CSS del canvas base como
    // exija el zoom, topeado por DPR (misma lógica que el render base).
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let densidad = dpr * p.zoom

    // Cap por área: si el canvas pedido excede el techo, bajamos la densidad
    // en vez de abortar. Se ve menos nítido que el ideal pero siempre mejor
    // que el base, y nunca revienta la memoria del device.
    const areaPedida = regionW * densidad * regionH * densidad
    if (areaPedida > p.maxPixels) {
      densidad *= Math.sqrt(p.maxPixels / areaPedida)
    }

    const w = Math.max(1, Math.round(regionW * densidad))
    const h = Math.max(1, Math.round(regionH * densidad))
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.")
    ctx.clearRect(0, 0, w, h)

    // El viewport se arma a la escala final (fitScale × densidad) y lo
    // trasladamos para que la esquina de la región caiga en el (0,0) del
    // canvas. x0 está en px CSS del base ⇒ en px de este render es x0×densidad.
    const viewport = page.getViewport({ scale: fitScale * densidad })
    const transform = [1, 0, 0, 1, -p.x0 * densidad, -p.y0 * densidad]

    if (cancelledBeforeStart) throw cancelledError()
    renderTask = page.render({ canvasContext: ctx, viewport, transform, canvas })
    await renderTask!.promise
    renderTask = null
    return { widthPx: w, heightPx: h, densidad, ms: performance.now() - t0 }
  })()

  return {
    promise,
    cancel: () => {
      cancelledBeforeStart = true
      if (renderTask) {
        try { renderTask.cancel() } catch { /* ver nota en renderPage */ }
        renderTask = null
      }
    },
  }
}

function cancelledError(): Error {
  const err = new Error("cancelled")
  ;(err as { name: string }).name = "RenderingCancelledException"
  return err
}

/**
 * Convierte un evento pointer/mouse en coordenadas normalizadas 0..1 relativas
 * al canvas ya escalado con transform. Devuelve `null` si el punto cae fuera
 * del área del canvas.
 */
export function pointerToNormalized(
  ev: { clientX: number; clientY: number },
  canvas: HTMLElement,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect()
  const x = (ev.clientX - rect.left) / rect.width
  const y = (ev.clientY - rect.top) / rect.height
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

/** Distancia euclídea entre dos puntos. */
export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}
