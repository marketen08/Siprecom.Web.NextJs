import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Payload {
  testGroupId: string
  tareaId: string
  /**
   * Por qué se descarta el registro. Lo exige el backend cuando el registro ya cerró
   * con las firmas del papel (tarea en APROBADO).
   */
  motivo?: string
}

/**
 * Reinicia una tarea del pack — hard-delete del Registro asociado y reset a
 * PENDIENTE. Si el pack estaba COMPLETADO por esta tarea, vuelve a ACTIVO
 * (el backend se ocupa del recalc). Espeja el hook homólogo del elemento.
 *
 * Desde 2026-11 el backend aplica acá el mismo control que en el reinicio de una
 * ElementoTarea suelta: una tarea APROBADO necesita motivo y rol (o ser quien cargó,
 * dentro de 24 h), y una FIRMADO no se reinicia — va por rehacer. Antes este camino
 * aceptaba las dos sin pedir nada.
 */
export function useReiniciarTareaPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId, motivo }: Payload) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/testgroups/${testGroupId}/tareas/${tareaId}/reiniciar`,
        { motivo },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
    },
  })
}
