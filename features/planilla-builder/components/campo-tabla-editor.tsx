"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle } from "@/features/planillas/types"
import { useCreateTablaColumna } from "@/features/campos/api/use-create-tabla-columna"
import { useDeleteTablaColumna } from "@/features/campos/api/use-delete-tabla-columna"
import { useReorderTablaColumnas } from "@/features/campos/api/use-reorder-tabla-columnas"
import { useCreateTablaFila } from "@/features/campos/api/use-create-tabla-fila"
import { useDeleteTablaFila } from "@/features/campos/api/use-delete-tabla-fila"
import { useReorderTablaFilas } from "@/features/campos/api/use-reorder-tabla-filas"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CampoTablaEditorProps {
  campo: PlanillaCampoDetalle
}

/**
 * Editor de la definición de un campo Tabla (tipoDato === 9):
 * - Columnas: encabezados de la tabla. Marcá una como "columna de etiquetas" (1ª columna
 *   read-only de una tabla matriz, con las etiquetas precargadas por fila).
 * - Filas predefinidas: si agregás filas, la tabla pasa a "matriz" (filas fijas). Si no hay
 *   filas, es dinámica (el operador agrega filas al completar; el N por defecto se configura aparte).
 * La definición vive en el Campo global, así que los cambios impactan todas las planillas que lo usan.
 */
export function CampoTablaEditor({ campo }: CampoTablaEditorProps) {
  const columnas = [...(campo.columnas ?? [])].sort((a, b) => a.orden - b.orden)
  const filas = [...(campo.filas ?? [])].sort((a, b) => a.orden - b.orden)

  const [newColumna, setNewColumna] = useState("")
  const [newColumnaEsEtiqueta, setNewColumnaEsEtiqueta] = useState(false)
  const [newFila, setNewFila] = useState("")

  const createColumna = useCreateTablaColumna()
  const deleteColumna = useDeleteTablaColumna()
  const reorderColumnas = useReorderTablaColumnas()
  const createFila = useCreateTablaFila()
  const deleteFila = useDeleteTablaFila()
  const reorderFilas = useReorderTablaFilas()

  const handleAddColumna = () => {
    if (!newColumna.trim()) return
    createColumna.mutate(
      {
        campoId: campo.campoId,
        encabezado: newColumna.trim(),
        esColumnaEtiqueta: newColumnaEsEtiqueta,
        orden: columnas.reduce((m, c) => Math.max(m, c.orden), 0) + 1,
      },
      {
        onSuccess: () => {
          setNewColumna("")
          setNewColumnaEsEtiqueta(false)
        },
      }
    )
  }

  const handleAddFila = () => {
    if (!newFila.trim()) return
    createFila.mutate(
      {
        campoId: campo.campoId,
        etiquetaFila: newFila.trim(),
        orden: filas.reduce((m, f) => Math.max(m, f.orden), 0) + 1,
      },
      { onSuccess: () => setNewFila("") }
    )
  }

  const swapColumna = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= columnas.length) return
    const reordered = [...columnas]
    ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
    reorderColumnas.mutate({ campoId: campo.campoId, orderedIds: reordered.map((c) => c.id) })
  }

  const swapFila = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= filas.length) return
    const reordered = [...filas]
    ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
    reorderFilas.mutate({ campoId: campo.campoId, orderedIds: reordered.map((f) => f.id) })
  }

  const esMatriz = filas.length > 0

  return (
    <div className="space-y-3 rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
      <Label className="text-xs font-semibold text-indigo-900">Definición de la tabla</Label>

      {/* Columnas */}
      <div>
        <Label className="text-xs">Columnas</Label>
        <div className="mt-1 space-y-1">
          {columnas.map((c, i, arr) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
              <span className="flex-1">{c.encabezado}</span>
              {c.esColumnaEtiqueta && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                  etiquetas
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => swapColumna(i, -1)}
                disabled={i === 0 || reorderColumnas.isPending}
                title="Mover arriba"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => swapColumna(i, 1)}
                disabled={i === arr.length - 1 || reorderColumnas.isPending}
                title="Mover abajo"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive"
                onClick={() => deleteColumna.mutate({ campoId: campo.campoId, columnaId: c.id })}
                disabled={deleteColumna.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-1.5 mt-1.5">
            <Input
              value={newColumna}
              onChange={(e) => setNewColumna(e.target.value)}
              placeholder="encabezado (ej: 0, 15, RPM...)"
              className="h-7 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumna()
                if (e.key === "Escape") setNewColumna("")
              }}
            />
            <label className="flex items-center gap-1 text-[10px] shrink-0 cursor-pointer" title="Primera columna read-only con etiquetas por fila (tabla matriz)">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300"
                checked={newColumnaEsEtiqueta}
                onChange={(e) => setNewColumnaEsEtiqueta(e.target.checked)}
              />
              etiquetas
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleAddColumna}
              disabled={createColumna.isPending}
            >
              <Plus className="h-3.5 w-3.5 text-green-600" />
            </Button>
          </div>

          {columnas.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sin columnas definidas.</p>
          )}
        </div>
      </div>

      {/* Filas predefinidas (matriz) */}
      <div>
        <Label className="text-xs">Filas predefinidas (opcional — tabla matriz)</Label>
        <div className="mt-1 space-y-1">
          {filas.map((f, i, arr) => (
            <div key={f.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
              <span className="flex-1">{f.etiquetaFila}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => swapFila(i, -1)}
                disabled={i === 0 || reorderFilas.isPending}
                title="Mover arriba"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => swapFila(i, 1)}
                disabled={i === arr.length - 1 || reorderFilas.isPending}
                title="Mover abajo"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive"
                onClick={() => deleteFila.mutate({ campoId: campo.campoId, filaId: f.id })}
                disabled={deleteFila.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-1.5 mt-1.5">
            <Input
              value={newFila}
              onChange={(e) => setNewFila(e.target.value)}
              placeholder="etiqueta de fila (ej: TEMP. COJINETE 1)"
              className="h-7 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFila()
                if (e.key === "Escape") setNewFila("")
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleAddFila}
              disabled={createFila.isPending}
            >
              <Plus className="h-3.5 w-3.5 text-green-600" />
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {esMatriz
              ? "Tabla matriz: filas fijas con etiqueta precargada. El operador solo completa las celdas."
              : "Sin filas predefinidas = tabla dinámica: el operador agrega filas al completar (2 a 10)."}
          </p>
        </div>
      </div>
    </div>
  )
}
