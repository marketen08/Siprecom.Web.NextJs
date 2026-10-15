/**
 * Normaliza una etiqueta libre a un "código" legible para un Campo del catálogo.
 * Comportamiento:
 *   1. Quitar tildes/diacríticos (NFD + regex).
 *   2. UPPERCASE.
 *   3. Reemplazar espacios y no-alfanuméricos por `_`.
 *   4. Colapsar `_` duplicados y limpiar bordes.
 *   5. Remover stopwords cortas en español (DE, DEL, LA, EL, LOS, LAS, Y, CON,
 *      PARA, POR, EN, AL) porque en códigos técnicos suelen sobrar y siempre
 *      recortan bien sin perder claridad.
 *   6. Truncar al último `_` que caiga dentro del límite (fallback: hard cut).
 *
 * El default de `maxLength=20` es un compromiso entre "legible" y "compacto"
 * para códigos de planillas industriales — la mayoría de etiquetas comunes caen
 * bajo ese límite después del filtrado de stopwords.
 *
 * Ejemplos:
 *   "Temperatura del Aceite"                → "TEMPERATURA_ACEITE"
 *   "Presión Inicial de Prueba"             → "PRESION_INICIAL"
 *   "Verificación de continuidad eléctrica" → "VERIFICACION_CONT"
 */
const STOPWORDS = new Set([
  "DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "CON", "PARA", "POR", "EN", "AL",
])

export function slugifyCodigoCampo(input: string, maxLength = 20): string {
  if (!input) return ""

  // 1-4: normalización base
  const normalizado = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar diacríticos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_") // no-alfanumérico → _
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")

  if (!normalizado) return ""

  // 5. Sacar stopwords. Preservamos el orden original de las palabras útiles.
  const palabras = normalizado.split("_")
  let utiles = palabras.filter((p) => p && !STOPWORDS.has(p))
  // Edge case: si TODAS las palabras eran stopwords (raro pero posible),
  // caemos al normalizado sin filtrar — mejor un código imperfecto que vacío.
  if (utiles.length === 0) utiles = palabras.filter(Boolean)

  const filtrado = utiles.join("_")

  // 6. Truncate limpio al último `_` dentro del límite.
  if (filtrado.length <= maxLength) return filtrado

  const cortadoDuro = filtrado.slice(0, maxLength)
  const ultimoUnderscore = cortadoDuro.lastIndexOf("_")
  // Si el corte queda muy corto sin el fallback duro, usamos el corte duro
  // (mejor perder claridad al final que devolver un código de 3 chars).
  if (ultimoUnderscore >= Math.floor(maxLength * 0.5)) {
    return cortadoDuro.slice(0, ultimoUnderscore).replace(/_+$/, "")
  }
  return cortadoDuro.replace(/_+$/, "")
}
