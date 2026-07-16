import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Payload {
  testGroupId: string
  tareaId: string
}

/**
 * Reinicia una tarea del pack — hard-delete del Registro asociado y reset a
 * PENDIENTE. Si el pack estaba COMPLETADO por esta tarea, vuelve a ACTIVO
 * (el backend se ocupa del recalc). Espeja el hook homólogo del elemento.
 */
export function useReiniciarTareaPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId }: Payload) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/testgroups/${testGroupId}/tareas/${tareaId}/reiniciar`,
        {},
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
    },
  })
}
