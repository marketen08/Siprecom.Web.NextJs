"use client"

import { useMemo } from "react"
import { Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle } from "@/features/planillas/types"
import { Button } from "@/components/ui/button"

export const TABLA_MIN_FILAS = 2
export const TABLA_MAX_FILAS = 10

/** Parsea el ValorJson { "filas": [ ["c1","c2"], ... ] } a matriz de strings, o null si es inválido. */
export function parseTablaFilas(value: string | null | undefined): string[][] | null {
  if (!value) return null
  try {
    const obj = JSON.parse(value)
    if (!obj || !Array.isArray(obj.filas)) return null
    return obj.filas.map((f: unknown) =>
      Array.isArray(f) ? f.map((c) => (c == null ? "" : String(c))) : []
    )
  } catch {
    return null
  }
}

/** True si la matriz tiene al menos una celda con contenido. */
export function tablaTieneDatos(value: string | null | undefined): boolean {
  const filas = parseTablaFilas(value)
  if (!filas) return false
  return filas.some((row) => row.some((c) => (c ?? "").trim() !== ""))
}

/**
 * Input de un campo Tabla (tipoDato === 9) en el formulario de carga digital.
 * - Matriz (con filas predefinidas): filas fijas; la 1ª columna muestra la etiqueta read-only.
 * - Dinámica (sin filas): el operador agrega/quita filas (2 a 10).
 * Solo celdas de texto. Emite el ValorJson serializado vía onChange cuando el usuario edita.
 */
export function CampoTablaInput({
  campo,
  value,
  onChange,
  readOnly,
}: {
  campo: PlanillaCampoDetalle
  value: string
  onChange: (v: string) => void
  readOnly: boolean
}) {
  const columnas = useMemo(
    () => [...(campo.columnas ?? [])].sort((a, b) => a.orden - b.orden),
    [campo.columnas]
  )
  const filasDef = useMemo(
    () => [...(campo.filas ?? [])].sort((a, b) => a.orden - b.orden),
    [campo.filas]
  )
  const editableCount = useMemo(
    () => columnas.filter((c) => !c.esColumnaEtiqueta).length,
    [columnas]
  )
  const esMatriz = filasDef.length > 0

  // Filas actuales (solo celdas editables), derivadas del value o de la definición.
  const rows: string[][] = useMemo(() => {
    const parsed = parseTablaFilas(value)
    const norm = (r: string[]) => {
      const out = r.slice(0, editableCount)
      while (out.length < editableCount) out.push("")
      return out
    }
    if (esMatriz) {
      return filasDef.map((_, i) => norm(parsed?.[i] ?? []))
    }
    if (parsed && parsed.length > 0) return parsed.map(norm)
    const init = Math.min(TABLA_MAX_FILAS, Math.max(TABLA_MIN_FILAS, campo.numeroFilas ?? TABLA_MIN_FILAS))
    return Array.from({ length: init }, () => Array<string>(editableCount).fill(""))
  }, [value, editableCount, esMatriz, filasDef, campo.numeroFilas])

  const emit = (next: string[][]) => onChange(JSON.stringify({ filas: next }))

  const setCell = (ri: number, ci: number, v: string) => {
    const next = rows.map((r) => [...r])
    next[ri][ci] = v
    emit(next)
  }

  const addRow = () => {
    if (rows.length >= TABLA_MAX_FILAS) return
    emit([...rows.map((r) => [...r]), Array<string>(editableCount).fill("")])
  }

  const removeRow = (ri: number) => {
    if (rows.length <= TABLA_MIN_FILAS) return
    emit(rows.filter((_, i) => i !== ri))
  }

  if (columnas.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Tabla sin columnas definidas.</p>
  }

  // Segmenta las columnas en tramos contiguos con el mismo `grupo` para el
  // header agrupador. Columnas sin grupo (o vacío) salen como celdas vacías
  // individuales para mantener alineada la grilla. La col extra "eliminar"
  // (solo tablas dinámicas) también aparece como una celda vacía sin agrupar.
  const grupoTramos = useMemo(() => {
    const tramos: Array<{ grupo: string | null; span: number }> = []
    for (const c of columnas) {
      const g = (c.grupo ?? "").trim() || null
      const last = tramos[tramos.length - 1]
      if (last && last.grupo === g && g !== null) {
        last.span += 1
      } else {
        tramos.push({ grupo: g, span: 1 })
      }
    }
    return tramos
  }, [columnas])

  const hayGrupos = grupoTramos.some((t) => t.grupo !== null)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm border-collapse">
          <thead>
            {hayGrupos && (
              <tr className="bg-gray-100">
                {grupoTramos.map((t, i) => (
                  <th
                    key={i}
                    colSpan={t.span}
                    className="border-b border-r last:border-r-0 px-2 py-1 text-center font-semibold text-gray-700"
                  >
                    {t.grupo ?? ""}
                  </th>
                ))}
                {!esMatriz && !readOnly && <th className="border-b w-8" />}
              </tr>
            )}
            <tr className="bg-gray-50">
              {columnas.map((c) => (
                <th
                  key={c.id}
                  className="border-b border-r last:border-r-0 px-2 py-1.5 text-left font-medium text-gray-700"
                >
                  {c.encabezado}
                </th>
              ))}
              {!esMatriz && !readOnly && <th className="border-b px-2 py-1.5 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              let e = -1
              return (
                <tr key={ri}>
                  {columnas.map((c) => {
                    if (c.esColumnaEtiqueta) {
                      return (
                        <td
                          key={c.id}
                          className="border-b border-r last:border-r-0 px-2 py-1 font-medium text-gray-700 bg-gray-50/50 whitespace-nowrap"
                        >
                          {filasDef[ri]?.etiquetaFila ?? ""}
                        </td>
                      )
                    }
                    e += 1
                    const ci = e
                    return (
                      <td key={c.id} className="border-b border-r last:border-r-0 p-0">
                        <input
                          type="text"
                          value={row[ci] ?? ""}
                          onChange={(ev) => setCell(ri, ci, ev.target.value)}
                          disabled={readOnly}
                          className="w-full px-2 py-1 bg-transparent outline-none focus:bg-blue-50 disabled:opacity-60"
                        />
                      </td>
                    )
                  })}
                  {!esMatriz && !readOnly && (
                    <td className="border-b px-1 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeRow(ri)}
                        disabled={rows.length <= TABLA_MIN_FILAS}
                        title="Quitar fila"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!esMatriz && !readOnly && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7"
            onClick={addRow}
            disabled={rows.length >= TABLA_MAX_FILAS}
          >
            <Plus className="h-3.5 w-3.5" /> Agregar fila
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Entre {TABLA_MIN_FILAS} y {TABLA_MAX_FILAS} filas.
          </span>
        </div>
      )}
    </div>
  )
}
