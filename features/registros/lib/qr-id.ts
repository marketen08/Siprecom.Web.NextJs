/**
 * Ids comprimidos del QR de una planilla.
 *
 * El QR lleva los dos GUID en 22 caracteres cada uno en vez de 36. No es una
 * optimización cosmética: con los GUID en texto la URL de un tenant real daba 109
 * caracteres, tres más de los 106 que aguanta un QR versión 6 con corrección M, y
 * el código salía versión 7 — 45 módulos en un cuadrado de ~22 mm, o sea 0,49 mm
 * por módulo. A 300 DPI eso son 5,8 píxeles por módulo y el escaneo queda al borde
 * de lo legible: sobre 12 registros reales de Pluspetrol, jsQR leía 6 y ZXing 4, y
 * los que fallaban no leían a ningún DPI. Comprimidos, la URL baja a 81 caracteres,
 * entra en versión 5 (37 módulos) y el módulo crece un 22%.
 *
 * El formato lo fija el backend en `Core/Helpers/QrCodigo.cs` y lo reimplementan
 * cuatro lectores: este archivo (web), la app de escritorio
 * (`Siprecom.Win.Local/Services/QrReaderService.cs`), la app mobile
 * (`src/lib/qr.ts`) y la ruta `/qr/...` de Next. Los 16 bytes salen del texto del
 * GUID leído de izquierda a derecha, NO de `Guid.ToByteArray()` de .NET, que
 * invierte los tres primeros campos: ese orden es una particularidad de .NET y
 * reproducirlo acá sería una fuente de bugs silenciosos.
 */

/** Alfabeto base64url, en el orden que fija el estándar. */
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Token comprimido → GUID canónico en minúsculas.
 *
 * Lo que no sean 22 caracteres base64url válidos vuelve tal cual: así un QR viejo,
 * que trae el GUID entero, atraviesa esta función sin tocarse y los dos formatos
 * conviven sin que el lector tenga que saber de antemano cuál le tocó.
 */
export function expandirIdQr(token: string): string {
  if (!token || token.length !== 22) return token

  // 22 caracteres × 6 bits = 132; los 16 bytes son los primeros 128 y los 4 que
  // sobran son el relleno que el emisor descartó junto con el "==".
  const bytes: number[] = []
  let acumulador = 0
  let bitsCargados = 0
  for (const c of token) {
    const v = ALFABETO.indexOf(c)
    if (v < 0) return token
    acumulador = (acumulador << 6) | v
    bitsCargados += 6
    if (bitsCargados >= 8) {
      bitsCargados -= 8
      bytes.push((acumulador >> bitsCargados) & 0xff)
    }
  }
  if (bytes.length !== 16) return token

  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}` +
    `-${hex.slice(16, 20)}-${hex.slice(20)}`
  )
}

/**
 * Un segmento de URL que sea un id de tarea o planilla, en cualquiera de los dos
 * formatos, devuelto siempre como GUID canónico. `null` si no es ninguno — con eso
 * el parser del QR decide si el path matchea o sigue buscando.
 */
export function idDesdeSegmentoQr(segmento: string): string | null {
  if (!segmento) return null
  if (GUID_RE.test(segmento)) return segmento.toLowerCase()

  const expandido = expandirIdQr(segmento)
  return GUID_RE.test(expandido) ? expandido : null
}
