// Copia los archivos WASM de web-ifc a public/wasm/ para que se sirvan estáticamente.
// El viewer IFC los carga vía URL (no como módulo importado), así que tienen que estar
// servidos por Next desde una ruta pública.
// Se ejecuta automáticamente en postinstall.

import { mkdirSync, copyFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const SRC_DIR = resolve(ROOT, "node_modules/web-ifc")
const DEST_DIR = resolve(ROOT, "public/wasm")

const FILES = ["web-ifc.wasm", "web-ifc-mt.wasm"]

try {
  if (!existsSync(SRC_DIR)) {
    // web-ifc puede no estar instalado (CI con install parcial). No es error.
    console.log("[copy-ifc-wasm] web-ifc no instalado; salteando.")
    process.exit(0)
  }
  mkdirSync(DEST_DIR, { recursive: true })
  for (const file of FILES) {
    const src = resolve(SRC_DIR, file)
    const dest = resolve(DEST_DIR, file)
    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log(`[copy-ifc-wasm] ${file} → public/wasm/`)
    } else {
      console.warn(`[copy-ifc-wasm] no encontrado: ${src}`)
    }
  }
} catch (err) {
  console.error("[copy-ifc-wasm] fallo:", err.message)
  // No frenamos el install — el dev verá el error al cargar el viewer.
  process.exit(0)
}
