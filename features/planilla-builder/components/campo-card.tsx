"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle, CampoTipoDato, CampoListaRenderMode } from "@/features/planillas/types"
import { CAMPO_TIPO_DATO, CAMPO_LISTA_RENDER_MODE_LABEL } from "@/features/planillas/types"
import { useRemoveCampo } from "@/features/planillas/api/use-remove-campo"
import { useUpdateCampo } from "@/features/planillas/api/use-update-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useDeleteOpcion } from "@/features/campos/api/use-delete-opcion"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { cn } from "@/lib/utils"

interface CampoCardProps {
  campo: PlanillaCampoDetalle
  planillaId: string
  /** Vecino anterior en la sección (para reordenar arriba). null si es el primero. */
  previousCampo?: PlanillaCampoDetalle | null
  /** Vecino siguiente en la sección (para reordenar abajo). null si es el último. */
  nextCampo?: PlanillaCampoDetalle | null
}

export function CampoCard({ campo, planillaId, previousCampo, nextCampo }: CampoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newOpcionValor, setNewOpcionValor] = useState("")
  const [newOpcionEtiqueta, setNewOpcionEtiqueta] = useState("")
  const [addingOpcion, setAddingOpcion] = useState(false)

  const removeMutation = useRemoveCampo()
  const updateMutation = useUpdateCampo()
  const createOpcionMutation = useCreateOpcion()
  const deleteOpcionMutation = useDeleteOpcion()

  const tipoDatoLabel = CAMPO_TIPO_DATO[campo.campoTipoDato as CampoTipoDato] ?? "—"
  const isLista = campo.campoTipoDato === 5

  const handleToggle = (field: "esObligatorio" | "visible" | "soloLectura", value: boolean) => {
    updateMutation.mutate({
      id: campo.id,
      planillaId,
      campoId: campo.campoId,
      planillaSeccionId: campo.planillaSeccionId,
      orden: campo.orden,
      esObligatorio: field === "esObligatorio" ? value : campo.esObligatorio,
      visible: field === "visible" ? value : campo.visible,
      soloLectura: field === "soloLectura" ? value : campo.soloLectura,
      valorDefault: campo.valorDefault,
      renderMode: campo.renderMode,
    })
  }

  const handleRenderModeChange = (value: CampoListaRenderMode) => {
    updateMutation.mutate({
      id: campo.id,
      planillaId,
      campoId: campo.campoId,
      planillaSeccionId: campo.planillaSeccionId,
      orden: campo.orden,
      esObligatorio: campo.esObligatorio,
      visible: campo.visible,
      soloLectura: campo.soloLectura,
      valorDefault: campo.valorDefault,
      renderMode: value,
    })
  }

  // Swap del orden con un vecino (previousCampo o nextCampo).
  // Como el index en DB no es UNIQUE, podemos hacer 2 updates seguidos sin colisión.
  const swapOrden = async (otro: PlanillaCampoDetalle) => {
    const ordenActual = campo.orden
    const ordenOtro = otro.orden
    await updateMutation.mutateAsync({
      id: campo.id,
      planillaId,
      campoId: campo.campoId,
      planillaSeccionId: campo.planillaSeccionId,
      orden: ordenOtro,
      esObligatorio: campo.esObligatorio,
      visible: campo.visible,
      soloLectura: campo.soloLectura,
      valorDefault: campo.valorDefault,
      renderMode: campo.renderMode,
    })
    await updateMutation.mutateAsync({
      id: otro.id,
      planillaId,
      campoId: otro.campoId,
      planillaSeccionId: otro.planillaSeccionId,
      orden: ordenActual,
      esObligatorio: otro.esObligatorio,
      visible: otro.visible,
      soloLectura: otro.soloLectura,
      valorDefault: otro.valorDefault,
      renderMode: otro.renderMode,
    })
  }

  const handleMoveUp = () => { if (previousCampo) swapOrden(previousCampo) }
  const handleMoveDown = () => { if (nextCampo) swapOrden(nextCampo) }

  const handleAddOpcion = () => {
    if (!newOpcionValor.trim() || !newOpcionEtiqueta.trim()) return
    createOpcionMutation.mutate(
      {
        campoId: campo.campoId,
        valor: newOpcionValor.trim(),
        etiqueta: newOpcionEtiqueta.trim(),
        orden: campo.opciones.length + 1,
      },
      {
        onSuccess: () => {
          setNewOpcionValor("")
          setNewOpcionEtiqueta("")
          setAddingOpcion(false)
        },
      }
    )
  }

  return (
    <div className={cn(
      "border rounded-lg bg-white transition-shadow",
      expanded ? "shadow-sm" : ""
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{campo.campoEtiqueta}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono shrink-0">
              {campo.campoCodigo}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
              {tipoDatoLabel}
            </span>
            {campo.campoUnidad && (
              <span className="text-xs text-muted-foreground shrink-0">{campo.campoUnidad}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMoveUp}
            disabled={!previousCampo || updateMutation.isPending}
            title="Mover arriba"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMoveDown}
            disabled={!nextCampo || updateMutation.isPending}
            title="Mover abajo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <ConfirmActionDialog
            trigger={<Trash2 className="h-4 w-4" />}
            triggerClassName="inline-flex items-center justify-center h-7 w-7 rounded-md text-destructive hover:bg-accent transition-colors"
            title="¿Quitar campo?"
            description={
              <>
                Se quitará <strong>{campo.campoEtiqueta}</strong> de esta planilla. El campo global no se elimina.
              </>
            }
            confirmText="Quitar"
            pendingText="Quitando..."
            variant="destructive"
            onConfirm={() => removeMutation.mutateAsync({ planillaId, campoId: campo.id })}
          />
        </div>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3 bg-gray-50 rounded-b-lg">
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.esObligatorio}
                onChange={(e) => handleToggle("esObligatorio", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Obligatorio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.visible}
                onChange={(e) => handleToggle("visible", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Visible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.soloLectura}
                onChange={(e) => handleToggle("soloLectura", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Solo lectura</span>
            </label>
          </div>

          <div>
            <Label className="text-xs">Valor por defecto</Label>
            <Input
              className="mt-1 h-7 text-sm"
              defaultValue={campo.valorDefault ?? ""}
              placeholder="—"
              onBlur={(e) => {
                if (e.target.value !== (campo.valorDefault ?? "")) {
                  updateMutation.mutate({
                    id: campo.id,
                    planillaId,
                    campoId: campo.campoId,
                    planillaSeccionId: campo.planillaSeccionId,
                    orden: campo.orden,
                    esObligatorio: campo.esObligatorio,
                    visible: campo.visible,
                    soloLectura: campo.soloLectura,
                    valorDefault: e.target.value || undefined,
                    renderMode: campo.renderMode,
                  })
                }
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Render mode (only for Lista) */}
          {isLista && (
            <div className="space-y-1">
              <Label className="text-xs">Cómo se muestra esta lista</Label>
              <Select
                value={String(campo.renderMode ?? 0)}
                onValueChange={(v) => handleRenderModeChange(Number(v) as CampoListaRenderMode)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>
                    {CAMPO_LISTA_RENDER_MODE_LABEL[campo.renderMode ?? 0]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPO_LISTA_RENDER_MODE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Opciones (only for Lista) */}
          {isLista && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Opciones de lista</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAddingOpcion(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                {campo.opciones.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 text-xs bg-white border rounded px-2 py-1">
                    <span className="font-mono text-gray-500">{o.valor}</span>
                    <span className="flex-1">{o.etiqueta}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={() => deleteOpcionMutation.mutate({ campoId: campo.campoId, opcionId: o.id })}
                      disabled={deleteOpcionMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {addingOpcion && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      value={newOpcionValor}
                      onChange={(e) => setNewOpcionValor(e.target.value)}
                      placeholder="valor"
                      className="h-7 text-xs w-24 font-mono"
                    />
                    <Input
                      value={newOpcionEtiqueta}
                      onChange={(e) => setNewOpcionEtiqueta(e.target.value)}
                      placeholder="etiqueta"
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddOpcion()
                        if (e.key === "Escape") {
                          setAddingOpcion(false)
                          setNewOpcionValor("")
                          setNewOpcionEtiqueta("")
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleAddOpcion}
                      disabled={createOpcionMutation.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        setAddingOpcion(false)
                        setNewOpcionValor("")
                        setNewOpcionEtiqueta("")
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </div>
                )}

                {campo.opciones.length === 0 && !addingOpcion && (
                  <p className="text-xs text-muted-foreground italic">Sin opciones definidas.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
