/**
 * Dispara la descarga de un PDF generado por el backend. Si el backend devuelve un
 * Content-Disposition con filename, se respeta; sino se usa el fallback. Hace el dance del
 * blob → object URL → link temporal → revoke para no leakear memoria.
 */
export async function downloadPdf(url: string, fallbackFilename: string) {
  const res = await fetch(url)
  if (!res.ok) {
    let msg = "No se pudo generar el PDF."
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
