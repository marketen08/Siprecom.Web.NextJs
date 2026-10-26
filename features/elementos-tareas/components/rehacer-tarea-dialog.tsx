"use client"

import { useState } from "react"

import { useRehacerTarea } from "@/features/elementos-tareas/api/use-rehacer-tarea"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  elementoTareaId: string
  elementoTag?: string | null
  tareaNombre?: string | null
}

/**
 * Rehacer una tarea ya firmada.
 *
 * El texto es deliberadamente explícito sobre lo que NO pasa —la firma anterior no
 * se anula— porque es lo contrario de lo que la gente espera de un botón así, y
 * sobre lo que SÍ pasa: el avance retrocede y el papel impreso deja de servir.
 *
 * El error del backend se muestra acá adentro (no hay toasts en la app), y es donde
 * aparece el bloqueo por certificado emitido con su explicación.
 */
export function RehacerTareaDialog({
  open,
  onOpenChange,
  elementoTareaId,
  elementoTag,
  tareaNombre,
}: Props) {
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const mutation = useRehacerTarea()

  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      setMotivo("")
      setError(null)
      mutation.reset()
    }
    onOpenChange(abierto)
  }

  async function confirmar() {
    setError(null)
    try {
      await mutation.mutateAsync({ elementoTareaId, motivo })
      cerrar(false)
    } catch (err) {
      setError((err as Error)?.message ?? "No se pudo rehacer la tarea.")
    }
  }

  const sinMotivo = motivo.trim().length === 0

  return (
    <AlertDialog open={open} onOpenChange={cerrar}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Rehacer esta tarea?</AlertDialogTitle>
          <AlertDialogDescription>
            {elementoTag && tareaNombre
              ? `${elementoTag} — ${tareaNombre}`
              : "Se creará una ejecución nueva de esta tarea."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Fuera de la Description: ésta renderiza un <p>, y meterle bloques adentro
            da HTML inválido. */}
        <div className="space-y-2 px-1 text-sm">
          <p>
            La firma anterior <strong>no se anula</strong>: la ejecución firmada queda
            intacta con su registro y su PDF, y se crea una ejecución nueva en estado{" "}
            <strong>PENDIENTE</strong> que queda vinculada a ella.
          </p>
          <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            El avance del subsistema <strong>retrocede</strong>: este trabajo vuelve a
            contar como pendiente. Y el QR ya impreso de esta tarea deja de servir — hay
            que imprimir la planilla de la ejecución nueva.
          </p>
        </div>

        <div className="space-y-1.5 px-1">
          <label htmlFor="motivo-retrabajo" className="text-xs font-medium text-gray-700">
            Motivo del retrabajo <span className="text-red-600">*</span>
          </label>
          <textarea
            id="motivo-retrabajo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={1000}
            placeholder="Por qué hay que rehacer un trabajo que ya estaba firmado"
            className="w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-muted-foreground">
            Queda registrado en la ejecución nueva. Es la explicación que va a leer quien
            audite por qué un trabajo firmado se hizo dos veces.
          </p>
        </div>

        {error && (
          <p className="mx-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Sin esto el dialog se cierra antes de que responda el backend y el
              // error de bloqueo por certificado no se llega a ver.
              e.preventDefault()
              confirmar()
            }}
            disabled={sinMotivo || mutation.isPending}
          >
            {mutation.isPending ? "Rehaciendo..." : "Rehacer tarea"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
