import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { EstadoTarea } from "./use-get-tareas-pack"

interface Payload {
  testGroupId: string
  tareaId: string
  estado: EstadoTarea
  observaciones?: string
  motivoRechazo?: string
}

export function useCambiarEstadoTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId, ...body }: Payload) =>
      apiClient.post(`/api/testgroups/${testGroupId}/tareas/${tareaId}/estado`, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
      qc.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}
