// Temporal: extrae metadatos + texto de un PDF usando el pdfjs que ya tiene el front.
import fs from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

const ruta = process.argv[2]
const desde = Number(process.argv[3] ?? 1)
const hasta = Number(process.argv[4] ?? 0)

const data = new Uint8Array(fs.readFileSync(ruta))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

const meta = await doc.getMetadata().catch(() => null)
console.log("=== metadatos ===")
console.log("  paginas  :", doc.numPages)
if (meta?.info) {
  for (const k of ["Title", "Author", "Creator", "Producer", "CreationDate", "ModDate"]) {
    if (meta.info[k]) console.log(`  ${k.padEnd(9)}:`, String(meta.info[k]).slice(0, 90))
  }
}

const fin = hasta > 0 ? Math.min(hasta, doc.numPages) : doc.numPages
console.log(`\n=== texto (paginas ${desde}-${fin}) ===`)
for (let i = desde; i <= fin; i++) {
  const page = await doc.getPage(i)
  const tc = await page.getTextContent()
  let linea = ""
  const lineas = []
  let yAnterior = null
  for (const item of tc.items) {
    const y = Math.round(item.transform[5])
    if (yAnterior !== null && Math.abs(y - yAnterior) > 2) {
      if (linea.trim()) lineas.push(linea.trim())
      linea = ""
    }
    linea += item.str
    yAnterior = y
  }
  if (linea.trim()) lineas.push(linea.trim())
  console.log(`\n--- pagina ${i} ---`)
  console.log(lineas.join("\n"))
}
