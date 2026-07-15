"use client"

/**
 * Detección visual de firma manuscrita en el escaneo. Usa los 4 fiduciales que
 * el template dibuja en las esquinas del bloque de firmas para:
 *   1) Ubicar el rectángulo exacto del bloque (tolera traslación/escala/rotación).
 *   2) Auto-calibrar el umbral de brillo usando los propios fiduciales negros
 *      como referencia — se adapta al contraste real del scan.
 *   3) Escanear solo la zona de DIBUJO (arriba del label "Operador / Fecha:"),
 *      así el texto del footer no falsea la densidad.
 *   4) Dividir el rectángulo en N slots respetando la geometría de la fila.
 *
 * Si NO detecta fiduciales (planilla vieja generada antes del cambio), devuelve
 * `sinFiduciales: true` y no aventura detección — el UI muestra "no verificable"
 * en vez de dar un falso positivo/negativo.
 */

import { detectFiducials, type FiducialDetectionResult } from "./detect-fiducials"

export interface DetectSignatureOptions {
  /**
   * Rotación (0/90/180/270) a aplicar al bitmap antes de analizar. Se usa el
   * valor detectado por el lector de QR (`QrLeidoResult.rotacionDetectada`).
   * Con fiduciales, la rotación fina la sacamos del ángulo TL→TR — este param
   * solo maneja los múltiplos de 90° que orient wrongly del scan.
   */
  rotacion?: 0 | 90 | 180 | 270
  /**
   * Densidad mínima (% de píxeles oscuros dentro de la zona de dibujo del slot)
   * para considerar que hay firma. Default 2.0 — más permisivo que antes porque
   * el recorte ya excluye el texto del footer.
   */
  umbralDensidadPct?: number
  /**
   * Cantidad de slots de firma física esperados. La zona entre fiduciales se
   * divide en N columnas iguales.
   */
  cantidadSlots?: number
  /**
   * Fracción vertical del rectángulo entre fiduciales que corresponde a la
   * zona de DIBUJO (arriba del label rol/fecha del template). Default 0.65 —
   * matchea `FirmaFiducialLayout.ZonaTextoAlturaFraccion` ± un poco de margen
   * para tolerar firmas que se extienden más abajo del área designada.
   */
  zonaDibujoAlturaFraccion?: number
}

export interface DetectSignatureSlotResult {
  indice: number
  detected: boolean
  densidadPct: number
}

export interface DetectSignatureResult {
  /** True si TODOS los slots esperados están firmados. */
  detected: boolean
  /** Cuántos slots (de `slotsTotal`) se detectaron con firma. */
  slotsDetectados: number
  /** N esperado. */
  slotsTotal: number
  /** Detalle por slot. Vacío cuando N == 0 o no hubo detección. */
  slots: DetectSignatureSlotResult[]
  paginaAnalizada: number | null
  /**
   * True cuando el scan no tenía fiduciales — la detección se salteó y NO se
   * puede afirmar nada. El UI debe mostrar un estado explícito "no verificable".
   */
  sinFiduciales: boolean
  /** Umbral efectivo usado (auto-calibrado desde los fiduciales). Debug/telemetría. */
  umbralUsado: number | null
  error: string | null
}

const empty = (patch: Partial<DetectSignatureResult>): DetectSignatureResult => ({
  detected: false,
  slotsDetectados: 0,
  slotsTotal: 1,
  slots: [],
  paginaAnalizada: null,
  sinFiduciales: false,
  umbralUsado: null,
  error: null,
  ...patch,
})

export async function detectSignatureInFooter(
  file: File,
  opts: DetectSignatureOptions = {},
): Promise<DetectSignatureResult> {
  const rotacion = opts.rotacion ?? 0
  const umbralDensidadPct = opts.umbralDensidadPct ?? 2.0
  const cantidadSlots = Math.max(1, Math.floor(opts.cantidadSlots ?? 1))
  const zonaDibujoFrac = Math.max(0.2, Math.min(0.95, opts.zonaDibujoAlturaFraccion ?? 0.65))

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
      return empty({ error: `Formato no soportado para detección: .${ext}`, slotsTotal: cantidadSlots })
    }

    if (rotacion !== 0) imageData = rotateImageData(imageData, rotacion)

    // 1) Buscar fiduciales. Si no están → no verificable.
    const fid = detectFiducials(imageData)
    if (!fid) {
      return empty({
        sinFiduciales: true,
        slotsTotal: cantidadSlots,
        paginaAnalizada: pagina,
        error: null,
      })
    }

    // 2) Umbral auto-calibrado. Los fiduciales son negros por diseño; medimos
    // su brillo real y sumamos un margen para diferenciar tinta genuina del
    // fondo. Cap para no caer bajo/sobre extremos absurdos.
    const umbral = Math.max(60, Math.min(160, Math.round(fid.fiducialBrightness + 70)))

    // 3) Detectar por slot dentro del rectángulo entre fiduciales.
    const slotResults = detectPorSlot(imageData, fid, cantidadSlots, zonaDibujoFrac, umbral)
    const slotsDetectados = slotResults.filter((s) => s.densidadPct >= umbralDensidadPct).length

    return {
      detected: slotsDetectados === cantidadSlots,
      slotsDetectados,
      slotsTotal: cantidadSlots,
      slots: slotResults.map((s, i) => ({
        indice: i,
        detected: s.densidadPct >= umbralDensidadPct,
        densidadPct: s.densidadPct,
      })),
      paginaAnalizada: pagina,
      sinFiduciales: false,
      umbralUsado: umbral,
      error: null,
    }
  } catch (err) {
    return empty({
      error: err instanceof Error ? err.message : "Error inesperado al analizar el archivo.",
      slotsTotal: cantidadSlots,
    })
  }
}

/**
 * Para cada uno de los N slots calcula el polígono de la zona de dibujo en el
 * espacio de la imagen y mide densidad de píxeles oscuros dentro. La zona de
 * dibujo son las 4 esquinas del slot pero acotadas al `zonaDibujoFrac` superior
 * del rectángulo — así evita el label rol/fecha que ya trae texto.
 */
function detectPorSlot(
  imgData: ImageData,
  fid: FiducialDetectionResult,
  N: number,
  zonaDibujoFrac: number,
  umbralBrillo: number,
): { densidadPct: number }[] {
  const w = imgData.width
  const px = imgData.data
  const results: { densidadPct: number }[] = []

  // Vectores de la base del rectángulo entre fiduciales.
  const tl = { x: fid.topLeft.centerX, y: fid.topLeft.centerY }
  const tr = { x: fid.topRight.centerX, y: fid.topRight.centerY }
  const bl = { x: fid.bottomLeft.centerX, y: fid.bottomLeft.centerY }
  const vRightX = tr.x - tl.x,
    vRightY = tr.y - tl.y
  const vDownX = bl.x - tl.x,
    vDownY = bl.y - tl.y

  for (let i = 0; i < N; i++) {
    // Rango normalizado del slot en el eje u (0..1 del rectángulo total).
    const uLeft = i / N
    const uRight = (i + 1) / N

    // Zona de dibujo: v en [0, zonaDibujoFrac].
    // Polígono en coords de imagen: 4 esquinas mapeadas por p = tl + u*vRight + v*vDown.
    const p00 = mapUV(tl, vRightX, vRightY, vDownX, vDownY, uLeft, 0)
    const p10 = mapUV(tl, vRightX, vRightY, vDownX, vDownY, uRight, 0)
    const p01 = mapUV(tl, vRightX, vRightY, vDownX, vDownY, uLeft, zonaDibujoFrac)
    const p11 = mapUV(tl, vRightX, vRightY, vDownX, vDownY, uRight, zonaDibujoFrac)

    // AABB del polígono para acotar el barrido de píxeles.
    const minX = Math.max(0, Math.floor(Math.min(p00.x, p10.x, p01.x, p11.x)))
    const maxX = Math.min(w - 1, Math.ceil(Math.max(p00.x, p10.x, p01.x, p11.x)))
    const minY = Math.max(0, Math.floor(Math.min(p00.y, p10.y, p01.y, p11.y)))
    const maxY = Math.min(imgData.height - 1, Math.ceil(Math.max(p00.y, p10.y, p01.y, p11.y)))

    let oscuros = 0,
      total = 0
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Test punto-en-cuadrilátero. Los 4 puntos p00/p10/p11/p01 forman un
        // paralelogramo (o casi) porque fiduciales → rectángulo afín.
        if (!pointInQuad(x, y, p00, p10, p11, p01)) continue
        total++
        const off = (y * w + x) * 4
        const lum = px[off] * 0.299 + px[off + 1] * 0.587 + px[off + 2] * 0.114
        if (lum < umbralBrillo) oscuros++
      }
    }

    results.push({ densidadPct: total === 0 ? 0 : (oscuros / total) * 100 })
  }
  return results
}

function mapUV(
  origin: { x: number; y: number },
  vRightX: number,
  vRightY: number,
  vDownX: number,
  vDownY: number,
  u: number,
  v: number,
): { x: number; y: number } {
  return {
    x: origin.x + u * vRightX + v * vDownX,
    y: origin.y + u * vRightY + v * vDownY,
  }
}

/**
 * Test punto-en-cuadrilátero convexo: cross product del punto contra los 4
 * lados (recorridos en orden). Si todos dan el mismo signo, está dentro.
 * Orden esperado de los vértices: p00 → p10 → p11 → p01 (horario o antihorario).
 */
function pointInQuad(
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const s1 = sign(cross(a, b, x, y))
  const s2 = sign(cross(b, c, x, y))
  const s3 = sign(cross(c, d, x, y))
  const s4 = sign(cross(d, a, x, y))
  return (s1 >= 0 && s2 >= 0 && s3 >= 0 && s4 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0 && s4 <= 0)
}

function cross(p: { x: number; y: number }, q: { x: number; y: number }, x: number, y: number): number {
  return (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x)
}

function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0
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
    const paginaIdx = doc.numPages
    const page = await doc.getPage(paginaIdx)
    // Escala 1.5 alcanza — no necesitamos leer QR, solo detectar fiduciales +
    // contar píxeles. Bumpearla a 2 no cambia significativamente la detección.
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
      if (angulo === 90) {
        dx = sh - 1 - y
        dy = x
      } else if (angulo === 180) {
        dx = sw - 1 - x
        dy = sh - 1 - y
      } else {
        dx = y
        dy = sw - 1 - x
      }
      const di = (dy * dw + dx) * 4
      dst[di] = data[si]
      dst[di + 1] = data[si + 1]
      dst[di + 2] = data[si + 2]
      dst[di + 3] = data[si + 3]
    }
  }
  return out
}
