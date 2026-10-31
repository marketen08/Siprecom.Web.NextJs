/**
 * Dispara la descarga de un PDF generado por el backend. Si el backend devuelve un
 * Content-Disposition con filename, se respeta; sino se usa el fallback. Hace el dance del
 * blob → object URL → link temporal → revoke para no leakear memoria.
 */
export function downloadPdf(url: string, fallbackFilename: string) {
  return downloadArchivo(url, fallbackFilename, "No se pudo generar el PDF.")
}

/**
 * Igual que `downloadPdf` pero para cualquier tipo de archivo — el único motivo de
 * tenerlo aparte es el mensaje de error, que se muestra al usuario y decir "PDF"
 * cuando bajó un Excel confunde.
 */
export async function downloadArchivo(
  url: string,
  fallbackFilename: string,
  mensajeError = "No se pudo generar el archivo.",
) {
  const res = await fetch(url)
  if (!res.ok) {
    let msg = mensajeError
    try {
      const body = await res.json()
      if (typeof body?.message === "string") msg = body.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  const cd = res.headers.get("Content-Disposition") ?? ""
  const match = /filename="?([^";]+)"?/.exec(cd)
  link.download = match?.[1] ?? fallbackFilename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
