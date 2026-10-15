"use client"

/**
 * Detector de fiduciales — puerto TS del algoritmo de C# en
 * `Siprecom.Server.Api/Core/Services/FirmaFiducialDetector.cs`. Se usa desde el
 * cliente para localizar los 4 cuadraditos negros que el template imprime en
 * las esquinas del bloque de firmas, y así ubicar el recuadro exacto para la
 * detección de firma manuscrita.
 *
 * Algoritmo: threshold binario + connected components (flood-fill BFS) +
 * filtro por tamaño / aspect / fill-ratio + búsqueda exhaustiva de la mejor
 * combinación de 4 candidatos que forme un rectángulo consistente.
 *
 * Si NO detecta los 4 fiduciales, retorna null — la política del sistema es
 * no adivinar posición cuando la planilla no trae fiduciales (backwards-
 * incompat con planillas viejas: hay que regenerarlas).
 */

export interface FiducialPoint {
  centerX: number
  centerY: number
  size: number
}

export interface FiducialDetectionResult {
  topLeft: FiducialPoint
  topRight: FiducialPoint
  bottomLeft: FiducialPoint
  bottomRight: FiducialPoint
  imageWidth: number
  imageHeight: number
  /**
   * Brillo promedio de los píxeles dentro de los fiduciales — sirve para
   * auto-calibrar el umbral de detección de firma según el contraste del scan.
   */
  fiducialBrightness: number
}

/**
 * Intenta detectar los 4 fiduciales en la imagen dada. Devuelve null si no
 * encuentra un rectángulo plausible.
 */
export function detectFiducials(imgData: ImageData): FiducialDetectionResult | null {
  const w = imgData.width
  const h = imgData.height

  // Threshold: pixel <100 (luminosidad) = "oscuro". Los fiduciales son cuadrados
  // negros sólidos así que caen muy por debajo aunque el scan esté opaco.
  const THRESHOLD = 100

  // Rango de tamaño del fiducial en píxeles. En el template son 6pt (~2mm);
  // al imprimir + escanear el tamaño depende de la resolución del scan.
  // Bracketamos: entre 0.2% y 5% del lado corto de la imagen.
  const minDim = Math.min(w, h)
  const minSide = Math.max(4, Math.floor(minDim / 500))
  const maxSide = Math.max(minSide + 5, Math.floor(minDim / 20))

  // Precomputamos la luminosidad de cada píxel.
  const gray = new Uint8Array(w * h)
  const px = imgData.data
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    // Luminosidad estándar (Rec. 601).
    gray[j] = ((px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000) | 0
  }

  const visited = new Uint8Array(w * h)
  const candidates: FiducialPoint[] = []

  // Buscamos solo del 30% inferior para arriba — el bloque de firmas siempre
  // vive al pie de la última página. Ahorra tiempo y descarta falsos positivos
  // por texto denso en el cuerpo del documento.
  const yStart = Math.floor(h / 3)

  for (let y = yStart; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (visited[idx]) continue
      if (gray[idx] > THRESHOLD) continue

      const fill = floodFill(gray, visited, w, h, x, y, THRESHOLD, maxSide)
      const bw = fill.maxX - fill.minX + 1
      const bh = fill.maxY - fill.minY + 1
      if (bw < minSide || bh < minSide) continue
      if (bw > maxSide || bh > maxSide) continue

      const aspect = bw / bh
      if (aspect < 0.7 || aspect > 1.4) continue

      const fillRatio = fill.count / (bw * bh)
      if (fillRatio < 0.55) continue

      candidates.push({
        centerX: fill.minX + Math.floor(bw / 2),
        centerY: fill.minY + Math.floor(bh / 2),
        size: Math.max(bw, bh),
      })
    }
  }

  if (candidates.length < 4) return null

  // Cap para el enumerador exhaustivo. Con >30 candidatos la combinatoria
  // explota. Nos quedamos con los 30 más "abajo" — los fiduciales siempre
  // están al pie. En scans normales suele haber <20 candidatos.
  let pool = candidates
  if (candidates.length > 30) {
    pool = [...candidates].sort((a, b) => b.centerY - a.centerY).slice(0, 30)
  }

  // Búsqueda exhaustiva: enumeramos combinaciones de 4 y elegimos la que
  // mejor forme un rectángulo (widths/heights matcheando + tamaños de blob
  // similares). Descarta falsos positivos en el medio del documento.
  let best: { tl: FiducialPoint; tr: FiducialPoint; bl: FiducialPoint; br: FiducialPoint } | null =
    null
  let bestScore = -Infinity

  const n = pool.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const subset = [pool[i], pool[j], pool[k], pool[l]]
          // Clasificar por extremos dentro del subset.
          const tl = minBy(subset, (c) => c.centerX + c.centerY)
          const br = maxBy(subset, (c) => c.centerX + c.centerY)
          const tr = maxBy(subset, (c) => c.centerX - c.centerY)
          const bl = minBy(subset, (c) => c.centerX - c.centerY)

          // Todos distintos.
          if (tl === tr || tl === bl || tl === br || tr === bl || tr === br || bl === br)
            continue

          const width1 = tr.centerX - tl.centerX
          const width2 = br.centerX - bl.centerX
          const height1 = bl.centerY - tl.centerY
          const height2 = br.centerY - tr.centerY
          if (width1 <= 20 || height1 <= 10) continue
          if (Math.abs(width1 - width2) > width1 * 0.15) continue
          if (Math.abs(height1 - height2) > height1 * 0.15) continue

          const widthMatch = 1 - Math.abs(width1 - width2) / Math.max(width1, width2)
          const heightMatch = 1 - Math.abs(height1 - height2) / Math.max(height1, height2)
          const area = Math.sqrt(width1 * height1)
          const avgY = (tl.centerY + tr.centerY + bl.centerY + br.centerY) / 4
          const avgSize = subset.reduce((s, c) => s + c.size, 0) / 4
          const sizeVar = Math.max(...subset.map((c) => Math.abs(c.size - avgSize))) / Math.max(1, avgSize)
          const sizeMatch = Math.max(0, 1 - sizeVar)

          const score =
            widthMatch * 200 + heightMatch * 200 + sizeMatch * 100 + area * 0.05 + avgY * 0.1
          if (score > bestScore) {
            bestScore = score
            best = { tl, tr, bl, br }
          }
        }
      }
    }
  }

  if (!best) return null

  // Auto-calibración del umbral: medimos el brillo promedio dentro de los
  // fiduciales detectados. Son negro puro por diseño así que dan un piso
  // real de "qué tan oscuro es negro" en este scan particular.
  const fiducialBrightness = averageBrightnessAt(gray, w, h, [
    best.tl,
    best.tr,
    best.bl,
    best.br,
  ])

  return {
    topLeft: best.tl,
    topRight: best.tr,
    bottomLeft: best.bl,
    bottomRight: best.br,
    imageWidth: w,
    imageHeight: h,
    fiducialBrightness,
  }
}

interface FloodFillResult {
  minX: number
  maxX: number
  minY: number
  maxY: number
  count: number
}

/**
 * Flood-fill BFS. Corta anticipadamente si el bbox supera 2x maxSide.
 */
function floodFill(
  gray: Uint8Array,
  visited: Uint8Array,
  w: number,
  h: number,
  startX: number,
  startY: number,
  threshold: number,
  maxSide: number,
): FloodFillResult {
  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY,
    count = 0
  // Queue como array circular con head — evita el overhead de shift() en Array.
  const queue: number[] = [startX, startY]
  let head = 0
  while (head < queue.length) {
    const px = queue[head++]
    const py = queue[head++]
    const idx = py * w + px
    if (visited[idx]) continue
    if (gray[idx] > threshold) continue
    visited[idx] = 1
    count++
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (py < minY) minY = py
    if (py > maxY) maxY = py

    if (maxX - minX > maxSide * 2 || maxY - minY > maxSide * 2) {
      // Corte anticipado — imposible que sea un fiducial y evita consumir
      // memoria en regiones grandes (fondos, tablas).
      return { minX, maxX, minY, maxY, count }
    }

    if (px + 1 < w) queue.push(px + 1, py)
    if (px - 1 >= 0) queue.push(px - 1, py)
    if (py + 1 < h) queue.push(px, py + 1)
    if (py - 1 >= 0) queue.push(px, py - 1)
  }
  return { minX, maxX, minY, maxY, count }
}

/**
 * Promedio de brillo dentro de un cuadrado centrado en cada fiducial, del
 * tamaño del fiducial. Ignora bordes anti-aliased tomando solo el centro 60%.
 */
function averageBrightnessAt(
  gray: Uint8Array,
  w: number,
  h: number,
  points: FiducialPoint[],
): number {
  let sum = 0,
    n = 0
  for (const p of points) {
    const half = Math.max(1, Math.floor((p.size * 0.6) / 2))
    for (let dy = -half; dy <= half; dy++) {
      const y = p.centerY + dy
      if (y < 0 || y >= h) continue
      for (let dx = -half; dx <= half; dx++) {
        const x = p.centerX + dx
        if (x < 0 || x >= w) continue
        sum += gray[y * w + x]
        n++
      }
    }
  }
  return n === 0 ? 0 : sum / n
}

function minBy<T>(arr: T[], key: (t: T) => number): T {
  let best = arr[0]
  let bestV = key(arr[0])
  for (let i = 1; i < arr.length; i++) {
    const v = key(arr[i])
    if (v < bestV) {
      bestV = v
      best = arr[i]
    }
  }
  return best
}

function maxBy<T>(arr: T[], key: (t: T) => number): T {
  let best = arr[0]
  let bestV = key(arr[0])
  for (let i = 1; i < arr.length; i++) {
    const v = key(arr[i])
    if (v > bestV) {
      bestV = v
      best = arr[i]
    }
  }
  return best
}
