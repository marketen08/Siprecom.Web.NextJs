import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Payload {
  testGroupId: string
  tareaId: string
}

/**
 * Excluye una tarea del pack (soft-delete de la TG-tarea). Acción de config
 * de Alcance — indica que esa tarea del catálogo no aplica para este pack.
 * El backend rechaza si tiene un Registro asociado.
 */
export function useExcluirTareaPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId }: Payload) =>
      apiClient.post<ApiResponse<unknown>>(
        `/api/testgroups/${testGroupId}/tareas/${tareaId}/excluir`,
        {},
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas-excluidas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
    },
  })
}
