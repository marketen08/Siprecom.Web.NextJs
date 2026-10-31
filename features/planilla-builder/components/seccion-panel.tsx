"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2, Check, X } from "lucide-react"

import type { PlanillaSeccion, PlanillaSeccionUpdateInput } from "@/features/planillas/types"
import { useCreateSeccion } from "@/features/planillas/api/use-create-seccion"
import { useUpdateSeccion } from "@/features/planillas/api/use-update-seccion"
import { useDeleteSeccion } from "@/features/planillas/api/use-delete-seccion"
import {
  ErrorEscrituraCampo,
  primerErrorDeMutaciones,
} from "@/features/campos/components/error-escritura-campo"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { cn } from "@/lib/utils"

interface SeccionPanelProps {
  planillaId: string
  secciones: PlanillaSeccion[]
  selectedSeccionId: string | null
  onSelect: (id: string | null) => void
}

/**
 * Payload de update para una sección, con un `orden` nuevo.
 *
 * El DTO de update es full-replace: lo que no se manda se borra. Por eso arrastra
 * nombreAlt/descripcion/mostrarTitulo aunque la acción solo mueva la sección de lugar.
 */
function payloadSeccion(
  s: PlanillaSeccion,
  planillaId: string,
  orden: number,
): PlanillaSeccionUpdateInput {
  return {
    id: s.id,
    planillaId,
    nombre: s.nombre,
    nombreAlt: s.nombreAlt ?? null,
    descripcion: s.descripcion,
    orden,
    mostrarTitulo: s.mostrarTitulo ?? true,
  }
}

export function SeccionPanel({
  planillaId,
  secciones,
  selectedSeccionId,
  onSelect,
}: SeccionPanelProps) {
  const [newNombre, setNewNombre] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const createMutation = useCreateSeccion()
  const updateMutation = useUpdateSeccion()
  const deleteMutation = useDeleteSeccion()

  // Las flechitas y el borrado se disparan sin await, así que sin esto un rechazo del
  // backend quedaba invisible: la lista no se movía y no había forma de saber por qué.
  const errorEscritura = primerErrorDeMutaciones(
    updateMutation,
    createMutation,
    deleteMutation,
  )

  // El orden de la nueva sale del MÁXIMO existente, no de la cantidad: con una sección
  // dada de baja (o con órdenes ya salteados) `length + 1` cae encima de un orden que
  // ya existe, y un empate deja a las flechitas sin nada que intercambiar.
  const siguienteOrden = secciones.reduce((m, s) => Math.max(m, s.orden), 0) + 1

  const handleAdd = () => {
    if (!newNombre.trim()) return
    createMutation.mutate(
      {
        planillaId,
        nombre: newNombre.trim(),
        orden: siguienteOrden,
      },
      {
        onSuccess: () => {
          setNewNombre("")
          setIsAdding(false)
        },
      }
    )
  }

  const handleEdit = (seccion: PlanillaSeccion) => {
    setEditingId(seccion.id)
    setEditingNombre(seccion.nombre)
  }

  const handleSaveEdit = (seccion: PlanillaSeccion) => {
    if (!editingNombre.trim()) return
    updateMutation.mutate(
      {
        id: seccion.id,
        planillaId,
        nombre: editingNombre.trim(),
        // Preservamos nombreAlt/mostrarTitulo/descripcion: el inline solo cambia el nombre;
        // el DTO de update es full-replace, así que sin esto se pierde el resto.
        nombreAlt: seccion.nombreAlt ?? null,
        descripcion: seccion.descripcion,
        orden: seccion.orden,
        mostrarTitulo: seccion.mostrarTitulo ?? true,
      },
      {
        onSuccess: () => {
          setEditingId(null)
        },
      }
    )
  }

  const handleDelete = async (seccion: PlanillaSeccion) => {
    await deleteMutation.mutateAsync({ planillaId, seccionId: seccion.id })
    if (selectedSeccionId === seccion.id) onSelect(null)
  }

  // Mover arriba/abajo: se intercambia la POSICIÓN con la vecina y se renumera la lista
  // entera (1..N). Mismo criterio que el de los campos en campo-card.
  //
  // Intercambiar solo los dos `orden` no alcanzaba: con órdenes repetidos —planillas
  // importadas o generadas desde el sistema anterior, ej. "Cierre" y "Diagrama" las dos
  // en orden 3— el swap escribía 3 sobre 3 y la lista quedaba igual, así que el botón
  // "no respondía". Renumerar normaliza el empate en el primer movimiento.
  //
  // Solo se escriben las filas cuyo orden cambia, así que en una planilla ya bien
  // numerada siguen siendo dos updates.
  //
  // El try/catch no es decorativo: el onClick llama a esto sin await, así que sin él un
  // update fallido sale como unhandled rejection. El mensaje lo muestra el cartel de
  // arriba, que lee `updateMutation.error`.
  const mover = async (seccion: PlanillaSeccion, dir: -1 | 1) => {
    const lista = [...secciones].sort((a, b) => a.orden - b.orden)
    const i = lista.findIndex((s) => s.id === seccion.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    try {
      for (const [idx, s] of lista.entries()) {
        if (s.orden !== idx + 1) await updateMutation.mutateAsync(payloadSeccion(s, planillaId, idx + 1))
      }
    } catch { /* el cartel de error ya lo muestra */ }
  }

  // Lista ordenada para que las flechitas operen sobre vecinos consistentes (no por id).
  const seccionesOrdenadas = [...secciones].sort((a, b) => a.orden - b.orden)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Secciones</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {errorEscritura && (
        <div className="mb-2">
          <ErrorEscrituraCampo error={errorEscritura} />
        </div>
      )}

      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {/* Sin sección option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "text-left px-3 py-2 rounded-md text-sm transition-colors",
            selectedSeccionId === null
              ? "bg-blue-50 text-blue-900 font-medium"
              : "hover:bg-gray-100 text-muted-foreground"
          )}
        >
          Sin sección
        </button>

        {seccionesOrdenadas.map((s, idx, arr) => (
          <div key={s.id} className="group flex items-center gap-1">
            {editingId === s.id ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editingNombre}
                  onChange={(e) => setEditingNombre(e.target.value)}
                  className="h-7 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(s)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleSaveEdit(s)}
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors min-w-0",
                    selectedSeccionId === s.id
                      ? "bg-blue-50 text-blue-900 font-medium"
                      : "hover:bg-gray-100"
                  )}
                >
                  <span className="block truncate">{s.nombre}</span>
                  {s.nombreAlt && (
                    <span className="block truncate text-[11px] italic text-gray-500 font-normal">
                      {s.nombreAlt}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => mover(s, -1)}
                    disabled={idx === 0 || updateMutation.isPending}
                    title="Mover arriba"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => mover(s, 1)}
                    disabled={idx === arr.length - 1 || updateMutation.isPending}
                    title="Mover abajo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEdit(s)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <ConfirmActionDialog
                    trigger={<Trash2 className="h-3 w-3" />}
                    triggerClassName="inline-flex items-center justify-center h-6 w-6 rounded-md text-destructive hover:bg-accent transition-colors"
                    title="¿Eliminar sección?"
                    description="Los campos de esta sección quedarán sin sección asignada."
                    confirmText="Eliminar"
                    pendingText="Eliminando..."
                    variant="destructive"
                    onConfirm={() => handleDelete(s)}
                  />
                </div>
              </>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-1 mt-1">
            <Input
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Nombre de sección..."
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
                if (e.key === "Escape") { setIsAdding(false); setNewNombre("") }
              }}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleAdd}
              disabled={createMutation.isPending}
            >
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => { setIsAdding(false); setNewNombre("") }}
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
