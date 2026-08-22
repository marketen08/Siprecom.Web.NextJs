"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"

import type { CampoTablaColumna, PlanillaCampoDetalle } from "@/features/planillas/types"
import { useCreateTablaColumna } from "@/features/campos/api/use-create-tabla-columna"
import { useDeleteTablaColumna } from "@/features/campos/api/use-delete-tabla-columna"
import { useReorderTablaColumnas } from "@/features/campos/api/use-reorder-tabla-columnas"
import { useUpdateTablaColumna } from "@/features/campos/api/use-update-tabla-columna"
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
  const [newColumnaGrupo, setNewColumnaGrupo] = useState("")
  const [newFila, setNewFila] = useState("")
  // Estado local para edición inline del Grupo por columna: mantenemos un
  // draft para no dispararle un PUT por cada tecla. Committéa al blur.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const createColumna = useCreateTablaColumna()
  const updateColumna = useUpdateTablaColumna()
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
        grupo: newColumnaGrupo.trim() || null,
        // Mismo default que el backend: la columna de etiquetas arranca más ancha.
        ancho: newColumnaEsEtiqueta ? 3 : 2,
      },
      {
        onSuccess: () => {
          setNewColumna("")
          setNewColumnaEsEtiqueta(false)
          setNewColumnaGrupo("")
        },
      }
    )
  }

  // El PUT de columna REEMPLAZA la fila entera, así que cualquier update tiene que
  // reenviar todos los campos — mandar solo el que cambió pisa el resto con los
  // defaults del DTO. Este helper arma el payload completo y aplica el override.
  const commitColumna = (
    col: CampoTablaColumna,
    overrides: Partial<Pick<CampoTablaColumna, "grupo" | "ancho" | "esColumnaEtiqueta">>,
    onDone?: () => void,
  ) => {
    updateColumna.mutate({
      id: col.id,
      campoId: col.campoId,
      encabezado: col.encabezado,
      orden: col.orden,
      esColumnaEtiqueta: col.esColumnaEtiqueta,
      grupo: col.grupo ?? null,
      ancho: col.ancho,
      ...overrides,
    }, { onSuccess: onDone })
  }

  // Persiste el Grupo de una columna cuando cambia (blur del input).
  const commitGrupo = (col: CampoTablaColumna) => {
    const draft = drafts[col.id]
    if (draft === undefined) return
    const nuevoGrupo = draft.trim() || null
    // Sin cambios efectivos: limpiamos el draft sin pegarle al backend.
    if ((col.grupo ?? null) === nuevoGrupo) {
      setDrafts((d) => { const c = { ...d }; delete c[col.id]; return c })
      return
    }
    commitColumna(col, { grupo: nuevoGrupo }, () =>
      setDrafts((d) => { const c = { ...d }; delete c[col.id]; return c }),
    )
  }

  // Marca/desmarca la columna de etiquetas. El backend garantiza que sea única:
  // al marcar una, desmarca las otras del mismo campo (ver
  // DesmarcarOtrasColumnasEtiquetaAsync). Por eso invalidamos y refetcheamos —
  // el cambio puede afectar a una columna distinta de la que se tocó.
  const commitEsEtiqueta = (col: CampoTablaColumna, valor: boolean) => {
    commitColumna(col, { esColumnaEtiqueta: valor })
  }

  // Ancho: se persiste en el acto (es un stepper acotado, no texto libre).
  const commitAncho = (col: CampoTablaColumna, nuevo: number) => {
    const clamped = Math.min(12, Math.max(1, Math.round(nuevo)))
    if (clamped === col.ancho) return
    commitColumna(col, { ancho: clamped })
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

  // Suma de pesos: es el denominador del % que mostramos al lado de cada columna.
  // Guardamos contra 0 (tabla recién creada) para no dividir por cero.
  const totalAncho = columnas.reduce((sum, c) => sum + (c.ancho || 0), 0)
  const porcentaje = (ancho: number) =>
    totalAncho > 0 ? Math.round((ancho / totalAncho) * 100) : 0

  return (
    <div className="space-y-3 rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
      <Label className="text-xs font-semibold text-indigo-900">Definición de la tabla</Label>

      {/* Columnas */}
      <div>
        <Label className="text-xs">Columnas</Label>
        <p className="text-[10px] text-muted-foreground">
          El ancho es un peso relativo: cada columna ocupa su peso sobre la suma de todos.
          No hace falta que sumen un total — el % de al lado se recalcula solo.
        </p>
        <div className="mt-1 space-y-1">
          {columnas.map((c, i, arr) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
              <span className="flex-1 truncate">{c.encabezado}</span>
              {/* Toggle de columna de etiquetas. Antes era un badge de solo lectura y
                  la única forma de cambiarlo era borrar la columna y recrearla. */}
              <label
                className={`shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition-colors ${
                  c.esColumnaEtiqueta
                    ? "bg-amber-100 text-amber-700"
                    : "text-muted-foreground hover:bg-gray-100"
                } ${updateColumna.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                title="Columna de etiquetas: primera columna read-only con las etiquetas de fila (tabla matriz). Sólo puede haber una por tabla."
              >
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-gray-300"
                  checked={c.esColumnaEtiqueta}
                  disabled={updateColumna.isPending}
                  onChange={(e) => commitEsEtiqueta(c, e.target.checked)}
                />
                etiquetas
              </label>
              <Input
                value={drafts[c.id] ?? c.grupo ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                onBlur={() => commitGrupo(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                  if (e.key === "Escape") setDrafts((d) => { const cp = { ...d }; delete cp[c.id]; return cp })
                }}
                placeholder="grupo (opcional)"
                className="h-6 text-[11px] w-28 shrink-0"
                disabled={updateColumna.isPending}
                title="Header agrupador. Columnas consecutivas con el mismo grupo se dibujan bajo un encabezado extra."
              />
              {/* Ancho: peso relativo + el % que representa hoy. El % es informativo
                  y se recalcula solo al agregar/quitar columnas — no hay total que
                  cuadrar a mano. */}
              <div
                className="flex items-center gap-1 shrink-0"
                title="Ancho relativo de la columna (1-12). El ancho real es este peso dividido la suma de todos."
              >
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={c.ancho}
                  onChange={(e) => commitAncho(c, Number(e.target.value))}
                  className="h-6 text-[11px] w-12"
                  disabled={updateColumna.isPending}
                />
                <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
                  {porcentaje(c.ancho)}%
                </span>
              </div>
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
                if (e.key === "Escape") { setNewColumna(""); setNewColumnaGrupo("") }
              }}
            />
            <Input
              value={newColumnaGrupo}
              onChange={(e) => setNewColumnaGrupo(e.target.value)}
              placeholder="grupo"
              className="h-7 text-[11px] w-24 shrink-0"
              title="Header agrupador (opcional). Columnas consecutivas con el mismo grupo se agrupan."
              onKeyDown={(e) => { if (e.key === "Enter") handleAddColumna() }}
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
