"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, ClipboardPaste, Star, Trash2, Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { cn } from "@/lib/utils"

import { useGetOpciones } from "../api/use-get-opciones"
import { useCreateOpcion } from "../api/use-create-opcion"
import { useDeleteOpcion } from "../api/use-delete-opcion"
import { useReorderOpciones } from "../api/use-reorder-opciones"
import { useToggleOpcionDefault } from "../api/use-toggle-opcion-default"
import { CHECKLIST_PRESETS } from "../lib/checklist-presets"
import { BulkPasteOpcionesDialog } from "./bulk-paste-opciones-dialog"
import type { CampoOpcion } from "@/features/planillas/types"

interface CampoOpcionesEditorProps {
  campoId: string
  /**
   * Si true, muestra la fila de botones "preset" arriba del editor. Aplicable
   * solo a campos Checklist — para Lista los presets no aplican semánticamente.
   * Aplicar un preset REEMPLAZA las opciones actuales (borra + crea) y afecta
   * a todas las planillas que usan el campo, por eso pedimos confirmación.
   */
  esChecklist?: boolean
}

/** Editor de opciones de un campo Lista o Checklist (catálogo global). */
export function CampoOpcionesEditor({ campoId, esChecklist = false }: CampoOpcionesEditorProps) {
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
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPending, setBulkPending] = useState(false)
  const [presetPending, setPresetPending] = useState(false)

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

  const handleBulkConfirm = async (
    nuevas: Array<{ valor: string; etiqueta: string }>,
  ) => {
    // Sin endpoint bulk: serializamos para respetar orden y no saturar la API.
    setBulkPending(true)
    try {
      let ordenBase = opciones.reduce((m, o) => Math.max(m, o.orden), 0)
      for (const op of nuevas) {
        ordenBase += 1
        await createOpcion.mutateAsync({
          campoId,
          valor: op.valor,
          etiqueta: op.etiqueta,
          orden: ordenBase,
        })
      }
      setBulkOpen(false)
    } finally {
      setBulkPending(false)
    }
  }

  const handleApplyPreset = async (preset: (typeof CHECKLIST_PRESETS)[number]) => {
    // Reemplazo total: borra todas las opciones actuales del catálogo y
    // recrea las del preset. Serializado para respetar orden.
    setPresetPending(true)
    try {
      for (const op of opciones) {
        await deleteOpcion.mutateAsync({ campoId, opcionId: op.id })
      }
      for (let i = 0; i < preset.opciones.length; i++) {
        const op = preset.opciones[i]
        await createOpcion.mutateAsync({
          campoId,
          valor: op.valor,
          etiqueta: op.etiqueta,
          orden: i + 1,
        })
      }
    } finally {
      setPresetPending(false)
    }
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-blue-900">Opciones de la lista</p>
          <p className="text-[10px] text-blue-700/70">
            Tocá la ★ para marcar el valor por defecto (precarga al agregar el campo a una planilla).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 shrink-0"
          onClick={() => setBulkOpen(true)}
          disabled={busy || bulkPending || presetPending}
        >
          <ClipboardPaste className="h-3.5 w-3.5" /> Pegar en lote
        </Button>
      </div>

      {/* Presets — sólo para Checklist. Reemplazan las opciones actuales del
          catálogo global; por eso pedimos confirmación (afecta a todas las
          planillas que usen este campo). */}
      {esChecklist && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-blue-700/70">Preset:</span>
          {CHECKLIST_PRESETS.map((p) => (
            <ConfirmActionDialog
              key={p.id}
              trigger={<span>{p.label}</span>}
              triggerClassName="inline-flex items-center h-6 px-2 rounded border bg-white text-[10px] font-medium hover:bg-gray-50 disabled:opacity-50"
              title={`¿Reemplazar opciones por "${p.label}"?`}
              description={
                <>
                  Esta acción <strong>borra las opciones actuales</strong> del
                  campo y las reemplaza por las del preset. Se aplica al
                  catálogo global — <strong>afecta a todas las planillas</strong>{" "}
                  que usan este campo.
                </>
              }
              confirmText="Reemplazar"
              pendingText="Aplicando..."
              variant="destructive"
              onConfirm={() => handleApplyPreset(p)}
            />
          ))}
        </div>
      )}

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

      <BulkPasteOpcionesDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        existingValores={opciones.map((o) => o.valor)}
        onConfirm={handleBulkConfirm}
        isPending={bulkPending}
      />
    </div>
  )
}
