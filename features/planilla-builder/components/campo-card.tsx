"use client"

import { useState } from "react"
import { Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle, CampoTipoDato } from "@/features/planillas/types"
import { CAMPO_TIPO_DATO } from "@/features/planillas/types"
import { useRemoveCampo } from "@/features/planillas/api/use-remove-campo"
import { useUpdateCampo } from "@/features/planillas/api/use-update-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useDeleteOpcion } from "@/features/campos/api/use-delete-opcion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface CampoCardProps {
  campo: PlanillaCampoDetalle
  planillaId: string
}

export function CampoCard({ campo, planillaId }: CampoCardProps) {
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
    })
  }

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
            <span className="font-medium text-sm">{campo.campoNombre || campo.campoEtiqueta}</span>
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
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar campo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se quitará <strong>{campo.campoNombre}</strong> de esta planilla. El campo global no se elimina.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => removeMutation.mutate({ planillaId, campoId: campo.id })}
                >
                  Quitar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                  })
                }
              }}
              disabled={updateMutation.isPending}
            />
          </div>

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
