"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { useIniciarTarea } from "@/features/elementos-tareas/api/use-iniciar-tarea"
import { useReiniciarTarea } from "@/features/elementos-tareas/api/use-reiniciar-tarea"
import type { ElementoTarea } from "@/features/elementos-tareas/types"

/**
 * Handlers compartidos por sheets que renderizan `TareaCard` (sheet del elemento
 * y sheet de preservación). Encapsula:
 * - iniciar tarea + navegación al registro nuevo
 * - abrir formulario / cargar PDF con gate previo
 * - reiniciar tarea
 * - errores de gate (predecesor incompleto, etc.) accesibles como `errorGate`.
 *
 * Los sheets consumen `iniciarMutation`/`reiniciarMutation` para saber si están
 * pending (para deshabilitar la card).
 */
export function useTareaHandlers() {
  const router = useRouter()
  const iniciarMutation = useIniciarTarea()
  const reiniciarMutation = useReiniciarTarea()
  const [errorGate, setErrorGate] = useState<string | null>(null)

  async function verificarGate(tareaId: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/elementos-tareas/${tareaId}/puede-ejecutar`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json?.message ?? "No se pudo verificar la tarea."
      const puede = json?.data?.puedeEjecutar
      if (puede === false) return json?.data?.motivo ?? json?.message ?? "La tarea no está disponible todavía."
      return null
    } catch {
      return null
    }
  }

  const handleIniciar = useCallback(async (tarea: ElementoTarea) => {
    try {
      const result = (await iniciarMutation.mutateAsync(tarea.id)) as unknown as {
        data?: { registroId?: string }
        registroId?: string
      }
      const registroId = result?.data?.registroId ?? result?.registroId
      if (registroId) router.push(`/ejecucion/registros/${registroId}`)
    } catch (err) {
      setErrorGate((err as Error)?.message ?? "No se pudo iniciar la tarea.")
    }
  }, [iniciarMutation, router])

  const handleAbrirFormulario = useCallback(async (tarea: ElementoTarea) => {
    if (!tarea.registroId) return
    const bloqueo = await verificarGate(tarea.id)
    if (bloqueo) { setErrorGate(bloqueo); return }
    router.push(`/ejecucion/registros/${tarea.registroId}`)
  }, [router])

  const handleCargarPdf = useCallback(async (tarea: ElementoTarea) => {
    if (!tarea.planillaId) return
    const bloqueo = await verificarGate(tarea.id)
    if (bloqueo) { setErrorGate(bloqueo); return }
    router.push(`/checklist/${tarea.planillaId}/${tarea.id}`)
  }, [router])

  const handleReiniciar = useCallback(async (tarea: ElementoTarea) => {
    await reiniciarMutation.mutateAsync(tarea.id)
  }, [reiniciarMutation])

  return {
    handleIniciar,
    handleAbrirFormulario,
    handleCargarPdf,
    handleReiniciar,
    iniciarMutation,
    reiniciarMutation,
    errorGate,
    setErrorGate,
  }
}
