"use client"

/**
 * Detección visual de firma manuscrita en el escaneo. Renderiza la última
 * página del PDF (o la imagen), recorta la franja inferior donde vive el
 * bloque de firmas del template, y cuenta píxeles oscuros. Si la densidad
 * de tinta supera el umbral, asumimos "hay firma".
 *
 * Silencioso ante error: cualquier fallo devuelve `detected: false` con un
 * mensaje descriptivo — la UI lo trata como "no detectado" (warning permisivo)
 * en vez de bloquear al usuario.
 */

export interface DetectSignatureOptions {
  /**
   * Rotación (0/90/180/270) a aplicar al bitmap antes de analizar. Se usa el
   * valor detectado por el lector de QR (`QrLeidoResult.rotacionDetectada`)
   * para no depender de EXIF ni de metadatos de PDF.
   */
  rotacion?: 0 | 90 | 180 | 270
  /**
   * Umbral de brillo por píxel (0-255). Un píxel con luminosidad menor cuenta
   * como "tinta". Default 180 — filtra el ruido de fondo del papel viejo.
   */
  umbralBrillo?: number
  /**
   * Densidad mínima (% de píxeles oscuros dentro del recorte) para considerar
   * que hay firma. Default 0.8 — bajo, porque una firma manuscrita en un
   * bloque de firmas ocupa poca superficie.
   */
  umbralDensidadPct?: number
  /**
   * Porcentaje inferior de la página que se analiza. Default 15 — el
   * bloque de firmas del template ocupa aprox. esa altura al pie.
   */
  altoZonaPct?: number
}

export interface DetectSignatureResult {
  detected: boolean
  densidadPct: number
  paginaAnalizada: number | null
  error: string | null
}

const empty = (patch: Partial<DetectSignatureResult>): DetectSignatureResult => ({
  detected: false,
  densidadPct: 0,
  paginaAnalizada: null,
  error: null,
  ...patch,
})

export async function detectSignatureInFooter(
  file: File,
  opts: DetectSignatureOptions = {},
): Promise<DetectSignatureResult> {
  const rotacion = opts.rotacion ?? 0
  const umbralBrillo = opts.umbralBrillo ?? 180
  const umbralDensidadPct = opts.umbralDensidadPct ?? 0.8
  const altoZonaPct = Math.max(1, Math.min(50, opts.altoZonaPct ?? 15))

  try {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase()
    let imageData: ImageData
    let pagina: number | null = null

    if (["jpg", "jpeg", "png", "webp", "bmp"].includes(ext)) {
      imageData = await imageToImageData(file)
    } else if (ext === "pdf") {
      const rendered = await renderPdfLastPage(file)
      imageData = rendered.imageData
      pagina = rendered.pagina
    } else {
      return empty({ error: `Formato no soportado para detección: .${ext}` })
    }

    if (rotacion !== 0) imageData = rotateImageData(imageData, rotacion)

    // Recorte de la franja inferior.
    const cropY = Math.floor(imageData.height * (1 - altoZonaPct / 100))
    const cropH = imageData.height - cropY
    const cropW = imageData.width
    const cropped = cropImageData(imageData, 0, cropY, cropW, cropH)

    // Densidad de tinta = píxeles bajo umbral / total.
    let oscuros = 0
    const total = cropped.width * cropped.height
    for (let i = 0; i < cropped.data.length; i += 4) {
      const r = cropped.data[i]
      const g = cropped.data[i + 1]
      const b = cropped.data[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum < umbralBrillo) oscuros++
    }
    const densidadPct = total > 0 ? (oscuros / total) * 100 : 0
    const detected = densidadPct >= umbralDensidadPct

    return { detected, densidadPct, paginaAnalizada: pagina, error: null }
  } catch (err) {
    return empty({
      error: err instanceof Error ? err.message : "Error inesperado al analizar el archivo.",
    })
  }
}

// ── Imagen ────────────────────────────────────────────────────────────────────

async function imageToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el canvas 2D.")
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function renderPdfLastPage(
  file: File,
): Promise<{ imageData: ImageData; pagina: number }> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString()

  const buf = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buf })
  const doc = await loadingTask.promise
  try {
    if (doc.numPages === 0) throw new Error("PDF sin páginas.")

    // El bloque de firmas del template siempre queda al final del checklist,
    // que en QuestPDF se corre a la última página si el contenido no entra en 1.
    const paginaIdx = doc.numPages
    const page = await doc.getPage(paginaIdx)
    // Escala 1.5 alcanza — no necesitamos leer QR, solo contar píxeles.
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("No se pudo crear el canvas 2D.")
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return {
      imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      pagina: paginaIdx,
    }
  } finally {
    await loadingTask.destroy()
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cropImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h)
  for (let row = 0; row < h; row++) {
    const srcOffset = ((y + row) * src.width + x) * 4
    const dstOffset = row * w * 4
    out.data.set(src.data.subarray(srcOffset, srcOffset + w * 4), dstOffset)
  }
  return out
}

function rotateImageData(src: ImageData, angulo: 90 | 180 | 270): ImageData {
  const { data, width: sw, height: sh } = src
  const dw = angulo === 180 ? sw : sh
  const dh = angulo === 180 ? sh : sw
  const out = new ImageData(dw, dh)
  const dst = out.data
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4
      let dx: number, dy: number
      if (angulo === 90) { dx = sh - 1 - y; dy = x }
      else if (angulo === 180) { dx = sw - 1 - x; dy = sh - 1 - y }
      else { dx = y; dy = sw - 1 - x }
      const di = (dy * dw + dx) * 4
      dst[di] = data[si]
      dst[di + 1] = data[si + 1]
      dst[di + 2] = data[si + 2]
      dst[di + 3] = data[si + 3]
    }
  }
  return out
}
