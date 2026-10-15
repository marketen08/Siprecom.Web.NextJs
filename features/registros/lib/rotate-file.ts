"use client"

/**
 * Rotación del archivo original para que quede derecho en base al ángulo
 * detectado por el lector de QR (`QrLeidoResult.rotacionDetectada`). Devuelve
 * un `File` nuevo — el original queda intacto.
 *
 * - Imágenes (JPG/PNG): re-render en un canvas rotado, `toBlob` con el mismo
 *   mime type y nombre.
 * - PDFs: `pdf-lib` para sumar la rotación al metadato `/Rotate` de cada
 *   página. No re-renderizamos (mantiene calidad del original, no infla
 *   tamaño).
 *
 * Silencioso ante error: si algo falla, devolvemos el archivo original — es
 * preferible subir el archivo tal como vino a bloquear al usuario.
 */
export async function rotateFile(file: File, angulo: 0 | 90 | 180 | 270): Promise<File> {
  if (angulo === 0) return file
  try {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase()
    if (["jpg", "jpeg", "png", "webp", "bmp"].includes(ext)) {
      return await rotateImage(file, angulo)
    }
    if (ext === "pdf") {
      return await rotatePdf(file, angulo)
    }
    return file
  } catch {
    return file
  }
}

// ── Imagen ────────────────────────────────────────────────────────────────────

async function rotateImage(file: File, angulo: 90 | 180 | 270): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  const dw = angulo === 180 ? width : height
  const dh = angulo === 180 ? height : width
  const canvas = document.createElement("canvas")
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext("2d")
  if (!ctx) return file

  // El eje del canvas gira sobre el origen (0,0) — trasladamos primero al
  // centro del canvas destino, rotamos, y dibujamos centrado en el origen.
  ctx.translate(dw / 2, dh / 2)
  ctx.rotate((angulo * Math.PI) / 180)
  ctx.drawImage(bitmap, -width / 2, -height / 2)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, file.type || "image/png", 0.92)
  })
  if (!blob) return file
  return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified })
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function rotatePdf(file: File, angulo: 90 | 180 | 270): Promise<File> {
  // Import dinámico: pdf-lib pesa ~200KB y sólo la usamos acá, no queremos
  // cargarla en el bundle inicial.
  const { PDFDocument, degrees } = await import("pdf-lib")
  const bytes = await file.arrayBuffer()
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })

  // Rotamos todas las páginas — la mayoría de los PDFs de planilla vienen
  // con 1 página, pero si son varias todas deberían quedar iguales.
  // La rotación del PDF se suma a la rotación previa (no la reemplaza):
  // así si el escaneo ya tenía /Rotate 90 y detectamos otros 90°, quedan 180°.
  for (const page of doc.getPages()) {
    const previa = page.getRotation().angle
    page.setRotation(degrees((previa + angulo) % 360))
  }

  const salida = await doc.save()
  // Uint8Array → ArrayBuffer normal para File
  const buffer = salida.buffer.slice(
    salida.byteOffset,
    salida.byteOffset + salida.byteLength,
  ) as ArrayBuffer
  return new File([buffer], file.name, {
    type: file.type || "application/pdf",
    lastModified: file.lastModified,
  })
}
