"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Star, Trash2, Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { useGetOpciones } from "../api/use-get-opciones"
import { useCreateOpcion } from "../api/use-create-opcion"
import { useDeleteOpcion } from "../api/use-delete-opcion"
import { useReorderOpciones } from "../api/use-reorder-opciones"
import { useToggleOpcionDefault } from "../api/use-toggle-opcion-default"
import type { CampoOpcion } from "@/features/planillas/types"

/** Editor de opciones de un campo Lista (global): agregar/quitar/reordenar + marcar default. */
export function CampoOpcionesEditor({ campoId }: { campoId: string }) {
  const { data, isLoading } = useGetOpciones(campoId)
  const opciones: CampoOpcion[] = (((data as any)?.data ?? []) as CampoOpcion[])
    .slice()
    .sort((a, b) => a.orden - b.orden)

  const createOpcion = useCreateOpcion()
  const deleteOpcion = useDeleteOpcion()
  const reorderOpciones = useReorderOpciones()
  const toggleDefault = useToggleOpcionDefault()

  const [valor, setValor] = useState("")
  const [etiqueta, setEtiqueta] = useState("")

  const busy =
    createOpcion.isPending || deleteOpcion.isPending || reorderOpciones.isPending || toggleDefault.isPending

  const handleAdd = () => {
    if (!valor.trim() || !etiqueta.trim()) return
    const orden = opciones.reduce((m, o) => Math.max(m, o.orden), 0) + 1
    createOpcion.mutate(
      { campoId, valor: valor.trim(), etiqueta: etiqueta.trim(), orden },
      { onSuccess: () => { setValor(""); setEtiqueta("") } },
    )
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= opciones.length) return
    const ids = opciones.map((o) => o.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorderOpciones.mutate({ campoId, orderedIds: ids })
  }

  return (
    <div className="mt-6 rounded-md border bg-blue-50/40 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-900">Opciones de la lista</p>
      <p className="text-[10px] text-blue-700/70 -mt-1">
        Tocá la ★ para marcar el valor por defecto (precarga al agregar el campo a una planilla).
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando opciones...
        </div>
      ) : opciones.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">Sin opciones todavía.</p>
      ) : (
        <div className="space-y-1">
          {opciones.map((op, i) => (
            <div key={op.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
              <button
                type="button"
                onClick={() => toggleDefault.mutate({ campoId, opcionId: op.id })}
                disabled={busy}
                className={cn("shrink-0", op.esDefault ? "text-amber-500" : "text-gray-300 hover:text-amber-400")}
                title="Marcar como valor por defecto"
                aria-label="Marcar como valor por defecto"
              >
                <Star className={cn("h-3.5 w-3.5", op.esDefault && "fill-amber-400")} />
              </button>
              <span className="font-mono text-gray-500 shrink-0">{op.valor}</span>
              <span className="flex-1 truncate">{op.etiqueta}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || busy}
                className="text-gray-400 hover:text-gray-700 shrink-0 disabled:opacity-30"
                aria-label="Mover arriba"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === opciones.length - 1 || busy}
                className="text-gray-400 hover:text-gray-700 shrink-0 disabled:opacity-30"
                aria-label="Mover abajo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteOpcion.mutate({ campoId, opcionId: op.id })}
                disabled={busy}
                className="text-gray-400 hover:text-red-500 shrink-0"
                aria-label="Quitar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 pt-1">
        <div className="space-y-1 w-24 shrink-0">
          <Label className="text-xs">Valor</Label>
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="SI"
            className="h-7 text-xs font-mono"
            disabled={busy}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <Label className="text-xs">Etiqueta</Label>
          <Input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Sí"
            className="h-7 text-xs"
            disabled={busy}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 shrink-0"
          onClick={handleAdd}
          disabled={busy || !valor.trim() || !etiqueta.trim()}
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>
    </div>
  )
}
