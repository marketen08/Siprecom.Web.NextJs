import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Payload {
  testGroupId: string
  tareaId: string
}

/**
 * Reincorpora al pack una tarea previamente excluida. Vuelve a IsActive=true
 * con Estado=PENDIENTE. Idempotente.
 */
export function useReincorporarTareaPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId }: Payload) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/testgroups/${testGroupId}/tareas/${tareaId}/reincorporar`,
        {},
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas-excluidas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
    },
  })
}
