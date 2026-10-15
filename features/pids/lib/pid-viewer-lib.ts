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
