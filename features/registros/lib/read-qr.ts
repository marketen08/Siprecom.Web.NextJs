"use client"

import jsQR from "jsqr"

/**
 * Resultado de leer el QR de un archivo. Espeja el `QrReaderResult` que usa la app
 * WinForms para carga masiva (Siprecom.Win.Local/Services/QrReaderService.cs).
 */
export interface QrLeidoResult {
  /** true si se decodificó algún QR, aunque no sea del formato esperado. */
  qrEncontrado: boolean
  /** true sólo si es del tipo `/checklist/{planillaId}/{elementoTareaId}`. */
  esChecklist: boolean
  /** GUID de la planilla (lowercased) cuando `esChecklist=true`. */
  planillaId: string | null
  /** GUID de la ElementoTarea (lowercased) cuando `esChecklist=true`. */
  elementoTareaId: string | null
  /** Texto crudo decodificado del QR (útil para debug). */
  contenidoQr: string | null
  /** Descripción del error cuando aplica (formato no soportado, ilegible, etc). */
  error: string | null
  /**
   * Ángulo que hubo que aplicar a la imagen original para leer el QR: 0 si el
   * archivo estaba derecho, 90/180/270 si estaba rotado. La Capa 2 lo usa para
   * corregir la orientación del archivo antes de subirlo.
   */
  rotacionDetectada: 0 | 90 | 180 | 270
}

const emptyResult = (patch: Partial<QrLeidoResult> = {}): QrLeidoResult => ({
  qrEncontrado: false,
  esChecklist: false,
  planillaId: null,
  elementoTareaId: null,
  contenidoQr: null,
  error: null,
  rotacionDetectada: 0,
  ...patch,
})

/**
 * Lee el QR de un File del navegador (PDF o imagen). No lanza — cualquier error
 * queda en `error`. Para PDFs, sólo lee la primera página: los oficiales de
 * planilla ponen el QR ahí; recorrer más páginas duplicaría el costo cliente y
 * la app WinForms tampoco lo hace en el fast path.
 */
export async function readQrFromFile(file: File): Promise<QrLeidoResult> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  try {
    if (["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(ext)) {
      return await readQrFromImage(file)
    }
    if (ext === "pdf") {
      return await readQrFromPdf(file)
    }
    return emptyResult({ error: `Formato no soportado: .${ext}` })
  } catch (err) {
    return emptyResult({
      error: err instanceof Error ? err.message : "Error inesperado al leer el QR.",
    })
  }
}

// ── Imagen ────────────────────────────────────────────────────────────────────

async function readQrFromImage(file: File): Promise<QrLeidoResult> {
  const url = URL.createObjectURL(file)
  try {
    const bitmap = await loadBitmap(url)
    const imageData = bitmapToImageData(bitmap)
    return scanImageData(imageData)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  const blob = await res.blob()
  return await createImageBitmap(blob)
}

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el canvas 2D.")
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function readQrFromPdf(file: File): Promise<QrLeidoResult> {
  // Import dinámico: pdfjs-dist tiene side-effects que rompen SSR. Al importar
  // sólo en el browser (via `"use client"` + import inline) mantenemos el bundle
  // del cliente contento y evitamos ejecutar módulos node-only.
  const pdfjs = await import("pdfjs-dist")
  // Worker vía URL relativa al módulo — Next / Turbopack la resuelve como asset.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString()

  const buf = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buf })
  const doc = await loadingTask.promise
  try {
    if (doc.numPages === 0) return emptyResult({ error: "PDF sin páginas." })

    // Sólo primera página — la planilla oficial pone el QR ahí. Renderizamos a
    // 2x para que el QR quede legible incluso en escaneos de calidad mediocre.
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return emptyResult({ error: "No se pudo crear el canvas 2D." })
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return scanImageData(imageData)
  } finally {
    // `destroy()` está en LoadingTask, no en PDFDocumentProxy directamente.
    await loadingTask.destroy()
  }
}

// ── Escaneo con jsQR ──────────────────────────────────────────────────────────

type Angulo = 0 | 90 | 180 | 270

/**
 * Escanea la imagen probando 0°, 90°, 180° y 270°. jsQR maneja rotaciones
 * pequeñas nativamente por los finder patterns del QR, pero cuando el papel
 * está boca abajo o el QR es chico dentro de un escaneo grande a veces falla
 * y hay que ayudarlo. Retorna el ángulo con el que se leyó el QR, que la
 * Capa 2 usa para corregir la orientación del archivo final.
 */
function scanImageData(imageData: ImageData): QrLeidoResult {
  // Preparamos la escala de grises una sola vez y la rotamos con la imagen —
  // así evitamos re-generarla en cada intento.
  const gris = toGrayscale(imageData)
  const angulos: Angulo[] = [0, 90, 180, 270]

  for (const angulo of angulos) {
    const original = angulo === 0 ? imageData : rotateImageData(imageData, angulo)
    let code = jsQR(original.data, original.width, original.height, {
      inversionAttempts: "attemptBoth",
    })
    if (code?.data) return parseChecklistUrl(code.data, angulo)

    const grisRotado = angulo === 0 ? gris : rotateImageData(gris, angulo)
    code = jsQR(grisRotado.data, grisRotado.width, grisRotado.height, {
      inversionAttempts: "attemptBoth",
    })
    if (code?.data) return parseChecklistUrl(code.data, angulo)
  }

  return emptyResult()
}

/**
 * Rotación exacta de un ImageData a 90/180/270 grados. Sin librerías: copia
 * pixel a pixel al nuevo buffer con el mapeo correspondiente. O(w*h) — para
 * las imágenes que manejamos (renderizadas a 2x → ~2M píxeles) toma pocos ms.
 */
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
        // (x,y) → (sh-1-y, x)
        dx = sh - 1 - y
        dy = x
      } else if (angulo === 180) {
        dx = sw - 1 - x
        dy = sh - 1 - y
      } else {
        // 270: (x,y) → (y, sw-1-x)
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

function toGrayscale(src: ImageData): ImageData {
  const out = new ImageData(src.width, src.height)
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i]
    const g = src.data[i + 1]
    const b = src.data[i + 2]
    // Coeficientes rec-601 (los mismos que usa la app WinForms).
    const v = 0.299 * r + 0.587 * g + 0.114 * b
    out.data[i] = out.data[i + 1] = out.data[i + 2] = v
    out.data[i + 3] = 255
  }
  return out
}

function parseChecklistUrl(contenido: string, rotacionDetectada: Angulo): QrLeidoResult {
  const partes = contenido.split(/[\\/?#\s]+/).filter(Boolean)
  // Buscar segmento "checklist" (case-insensitive) + 2 GUIDs contiguos.
  const guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  for (let i = 0; i < partes.length - 2; i++) {
    if (partes[i].toLowerCase() !== "checklist") continue
    if (guidRe.test(partes[i + 1]) && guidRe.test(partes[i + 2])) {
      return {
        qrEncontrado: true,
        esChecklist: true,
        planillaId: partes[i + 1].toLowerCase(),
        elementoTareaId: partes[i + 2].toLowerCase(),
        contenidoQr: contenido,
        error: null,
        rotacionDetectada,
      }
    }
  }
  return {
    qrEncontrado: true,
    esChecklist: false,
    planillaId: null,
    elementoTareaId: null,
    contenidoQr: contenido,
    error: "El QR no es de carga (se esperaba /checklist/{planillaId}/{elementoTareaId}).",
    rotacionDetectada,
  }
}
