import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TareaUpdateInput } from "../types"

export function useUpdateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TareaUpdateInput) => apiClient.put(`/api/tareas/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] })
      qc.invalidateQueries({ queryKey: ["tareas-select"] })
    },
  })
}
