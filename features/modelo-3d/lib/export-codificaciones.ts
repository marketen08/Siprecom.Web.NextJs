import * as XLSX from "xlsx"
import type { ApsCodificacion } from "../types"

/** Fila del reporte, con el flag de si fue marcada para trackear. */
interface FilaReporte extends ApsCodificacion {
  seleccionada: boolean
}

function construirFilas(rows: ApsCodificacion[], seleccion: Set<string>): FilaReporte[] {
  return rows.map((c) => ({ ...c, seleccionada: seleccion.has(c.patron) }))
}

function timestamp(): string {
  // Formato compacto para el nombre de archivo. En el browser Date está disponible.
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function nombreBase(archivoNombre?: string): string {
  const base = (archivoNombre ?? "modelo").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_")
  return `codificaciones-tag-${base}-${timestamp()}`
}

/** Exporta las codificaciones a un .xlsx (descarga directa, client-side). */
export function exportCodificacionesExcel(
  rows: ApsCodificacion[],
  seleccion: Set<string>,
  archivoNombre?: string,
) {
  const filas = construirFilas(rows, seleccion)
  const aoa: (string | number)[][] = [
    ["Trackear", "Cantidad de nodos", "Patrón", "Property name sugerido", "Ejemplo"],
    ...filas.map((f) => [
      f.seleccionada ? "Sí" : "No",
      f.cantidad,
      f.patron,
      f.propTagSugerida,
      f.ejemplo,
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 28 }, { wch: 40 }, { wch: 28 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Codificaciones TAG")
  XLSX.writeFile(wb, `${nombreBase(archivoNombre)}.xlsx`)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Exporta el reporte a PDF abriendo una ventana imprimible (el usuario elige
 * "Guardar como PDF"). No hay librería de PDF client-side, y el análisis APS es
 * caro de re-correr, así que generamos el PDF desde los datos ya cargados.
 */
export function exportCodificacionesPdf(
  rows: ApsCodificacion[],
  seleccion: Set<string>,
  archivoNombre?: string,
) {
  const filas = construirFilas(rows, seleccion)
  const fecha = new Date().toLocaleString("es-AR")
  const filasHtml = filas
    .map(
      (f) => `
      <tr>
        <td style="text-align:center">${f.seleccionada ? "✓" : ""}</td>
        <td style="text-align:right">${f.cantidad.toLocaleString("es-AR")}</td>
        <td><code>${escapeHtml(f.patron)}</code></td>
        <td><code>${escapeHtml(f.propTagSugerida)}</code></td>
        <td>${escapeHtml(f.ejemplo)}</td>
      </tr>`,
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Codificaciones de TAG — ${escapeHtml(archivoNombre ?? "modelo")}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: #555; font-size: 11px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d1d5db; padding: 5px 7px; vertical-align: top; }
  th { background: #1e3a8a; color: #fff; text-align: left; font-size: 11px; }
  tbody tr:nth-child(even) { background: #f3f4f6; }
  code { font-family: "Courier New", monospace; font-size: 10px; word-break: break-all; }
</style>
</head>
<body>
  <h1>Codificaciones de TAG</h1>
  <p class="sub">Modelo: <b>${escapeHtml(archivoNombre ?? "modelo")}</b> · ${filas.length} codificaciones detectadas · ${fecha}</p>
  <table>
    <thead>
      <tr>
        <th style="width:60px">Trackear</th>
        <th style="width:90px">Cantidad</th>
        <th>Patrón</th>
        <th>Property name sugerido</th>
        <th>Ejemplo</th>
      </tr>
    </thead>
    <tbody>${filasHtml}</tbody>
  </table>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) {
    alert("No se pudo abrir la ventana de impresión. Habilitá los pop-ups para descargar el PDF.")
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
