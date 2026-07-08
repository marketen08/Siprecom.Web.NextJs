"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

import { useGetFirmasConfig } from "@/features/proyectos/api/use-get-firmas-config"
import { useGetTareaFirmasConfig } from "../api/use-get-tarea-firmas-config"
import { useSaveTareaFirmasConfig } from "../api/use-save-tarea-firmas-config"
import type { FirmaConfigItem } from "@/features/proyectos/types"

interface Props {
  tareaId: string
  proyectoId: string
}

/**
 * Editor del override de firmas por Tarea. Radio "hereda del proyecto | propias".
 *  - hereda: la tarea NO tiene filas propias; el generador usa la config del proyecto.
 *    Muestra un preview read-only de las firmas heredadas.
 *  - propias: la tarea define sus propios slots (todo-o-nada). Al guardar con lista
 *    vacía, el server borra el override y la tarea vuelve a heredar.
 */
export function TareaFirmasConfigEditor({ tareaId, proyectoId }: Props) {
  const { data: tareaRaw, isLoading: loadingTarea } = useGetTareaFirmasConfig(tareaId)
  const { data: proyectoRaw, isLoading: loadingProyecto } = useGetFirmasConfig(proyectoId)
  const save = useSaveTareaFirmasConfig(tareaId)

  const slotsProyecto: FirmaConfigItem[] = proyectoRaw?.data ?? []
  const slotsServidor: FirmaConfigItem[] = tareaRaw?.data ?? []

  // "propias" = arrancó con override activo, o el usuario clickeó "Configurar propias".
  // Se persiste cuando se guarda con ≥1 slot; se apaga cuando se vuelve a heredar.
  const [modo, setModo] = useState<"hereda" | "propias" | null>(null)
  const [slots, setSlots] = useState<FirmaConfigItem[]>([])
  const [saved, setSaved] = useState(false)
  const [reverted, setReverted] = useState(false)

  // Inicializar desde el server la primera vez que la respuesta llega.
  useEffect(() => {
    if (modo !== null || loadingTarea) return
    if (slotsServidor.length > 0) {
      setSlots(slotsServidor.map((s, i) => ({ ...s, orden: i + 1 })))
      setModo("propias")
    } else {
      setSlots([])
      setModo("hereda")
    }
  }, [loadingTarea, slotsServidor, modo])

  function addSlot() {
    setSlots((prev) => [
      ...prev,
      { orden: prev.length + 1, rolNombre: "", descripcion: "", esObligatorio: true },
    ])
  }

  function removeSlot(index: number) {
    setSlots((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, orden: i + 1 })),
    )
  }

  function updateSlot(
    index: number,
    field: keyof FirmaConfigItem,
    value: string | boolean | number,
  ) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSlots((prev) => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, i) => ({ ...s, orden: i + 1 }))
    })
  }

  function moveDown(index: number) {
    if (index === slots.length - 1) return
    setSlots((prev) => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, i) => ({ ...s, orden: i + 1 }))
    })
  }

  async function handleSave() {
    const validos = slots.filter((s) => s.rolNombre.trim())
    await save.mutateAsync(validos.map((s, i) => ({ ...s, orden: i + 1 })))
    setSaved(true)
    setReverted(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleVolverAHeredar() {
    // Enviamos array vacío: el server borra las filas de la tarea y se vuelve a
    // heredar del proyecto. Los registros ya emitidos no se tocan (snapshot).
    await save.mutateAsync([])
    setSlots([])
    setModo("hereda")
    setReverted(true)
    setSaved(false)
    setTimeout(() => setReverted(false), 2500)
  }

  function pasarAPropias() {
    // Precargar con la config del proyecto como punto de partida — ahorra tipeo
    // en el caso más común ("como el proyecto pero con un ajuste").
    setSlots(
      slotsProyecto.map((s, i) => ({
        orden: i + 1,
        rolNombre: s.rolNombre,
        descripcion: s.descripcion,
        esObligatorio: s.esObligatorio,
      })),
    )
    setModo("propias")
  }

  if (loadingTarea || loadingProyecto || modo === null) {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración de firmas...
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-lg border bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-900">Firmas del registro</p>
          <p className="text-xs text-muted-foreground">
            Por defecto la tarea hereda la configuración del proyecto. Podés definir una
            propia sólo para esta tarea (todo-o-nada — no se mezcla con la del proyecto).
          </p>
        </div>
      </div>

      {/* Radio hereda / propias */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            checked={modo === "hereda"}
            onChange={() => {
              // Cambio local: sólo se persiste al confirmar. Si venía de "propias"
              // con datos guardados en server, pedimos confirmación explícita.
              if (slotsServidor.length > 0) return // usar botón "Volver a heredar"
              setModo("hereda")
              setSlots([])
            }}
            className="h-3.5 w-3.5"
          />
          <span>Hereda del proyecto</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            checked={modo === "propias"}
            onChange={() => {
              if (modo !== "propias") pasarAPropias()
            }}
            className="h-3.5 w-3.5"
          />
          <span>Definir firmas propias para esta tarea</span>
        </label>
      </div>

      {saved && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
          Configuración guardada.
        </p>
      )}
      {reverted && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1">
          La tarea vuelve a heredar la configuración del proyecto.
        </p>
      )}

      {/* Preview del proyecto en modo "hereda" */}
      {modo === "hereda" && (
        <div className="rounded-md border bg-white p-3 text-xs space-y-1.5">
          <p className="font-semibold text-gray-700">Firmas efectivas (del proyecto):</p>
          {slotsProyecto.length === 0 ? (
            <p className="text-muted-foreground italic">
              El proyecto no tiene firmas configuradas — los registros de esta tarea
              quedarán en Completado sin requerir firma.
            </p>
          ) : (
            <ol className="list-decimal list-inside space-y-0.5">
              {slotsProyecto.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.rolNombre}</span>
                  {s.descripcion && (
                    <span className="text-muted-foreground"> — {s.descripcion}</span>
                  )}
                  {!s.esObligatorio && (
                    <span className="text-gray-400"> (opcional)</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Editor de slots en modo "propias" */}
      {modo === "propias" && (
        <>
          <div className="space-y-2">
            {slots.length === 0 && (
              <div className="rounded-md border border-dashed bg-white p-4 text-center text-xs text-muted-foreground">
                Sin firmas. Agregá al menos un rol o volvé a heredar del proyecto.
              </div>
            )}

            {slots.map((slot, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border bg-white p-3">
                <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
                    aria-label="Subir"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === slots.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
                    aria-label="Bajar"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Rol *</label>
                    <Input
                      value={slot.rolNombre}
                      onChange={(e) => updateSlot(i, "rolNombre", e.target.value)}
                      placeholder="Ej: Supervisor, Cliente"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Descripción</label>
                    <Input
                      value={slot.descripcion}
                      onChange={(e) => updateSlot(i, "descripcion", e.target.value)}
                      placeholder="Ej: Supervisor de obra"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slot.esObligatorio}
                      onChange={(e) => updateSlot(i, "esObligatorio", e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-gray-600">
                      {slot.esObligatorio
                        ? "Obligatoria"
                        : "Opcional (puede quedar sin firma)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors pt-1 shrink-0"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addSlot}>
              <Plus className="h-4 w-4" /> Agregar rol
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={save.isPending || slots.filter((s) => s.rolNombre.trim()).length === 0}
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {save.isPending ? "Guardando..." : "Guardar"}
            </Button>

            {/* "Volver a heredar" — sólo si hay override guardado en server. */}
            {slotsServidor.length > 0 && (
              <ConfirmActionDialog
                trigger={<span className="text-xs">Volver a heredar del proyecto</span>}
                triggerClassName="text-xs text-blue-700 hover:underline ml-auto"
                title="¿Volver a heredar del proyecto?"
                description="Se borran las firmas propias de esta tarea y vuelve a usar la configuración del proyecto. Los registros ya emitidos no se modifican."
                confirmText="Volver a heredar"
                pendingText="Aplicando..."
                onConfirm={handleVolverAHeredar}
              />
            )}
          </div>

          {save.isError && (
            <p className="text-xs text-red-600">
              {(save.error as Error)?.message ?? "Error al guardar"}
            </p>
          )}
        </>
      )}
    </div>
  )
}
