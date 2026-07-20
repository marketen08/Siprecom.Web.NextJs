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
 * Renderiza una página del PDF a un `<canvas>` dado, escalando para que quepa
 * dentro del `maxWidth`. Devuelve el tamaño CSS final (widthPx/heightPx) que
 * el caller debe reflejar en el estilo del canvas + overlay.
 */
export async function renderPage(
  doc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
): Promise<{ widthPx: number; heightPx: number }> {
  const page = await doc.getPage(pageNumber)
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
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return { widthPx: cssW, heightPx: cssH }
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
