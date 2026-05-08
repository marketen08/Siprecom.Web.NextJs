/**
 * Algoritmo de packing: agrupa campos consecutivos en filas según `tamano` (1-12).
 * Si el siguiente campo no cabe en la fila actual (suma + tamano > 12), abre una nueva fila.
 *
 * Casos:
 *  - tamano fuera de rango → se clampa a [1, 12].
 *  - tamano = 12 → ocupa toda la fila solo.
 *  - 5 + 5 + 5 → primera fila tiene los dos primeros 5 (suma 10), tercer 5 va a fila nueva.
 */
export function packCampos<T extends { tamano?: number | null }>(items: T[]): T[][] {
  const filas: T[][] = []
  let actual: T[] = []
  let suma = 0

  for (const item of items) {
    const t = clamp(item.tamano ?? 4, 1, 12)
    if (suma + t > 12 && actual.length > 0) {
      filas.push(actual)
      actual = []
      suma = 0
    }
    actual.push(item)
    suma += t
  }
  if (actual.length > 0) filas.push(actual)
  return filas
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.floor(n)))
}
