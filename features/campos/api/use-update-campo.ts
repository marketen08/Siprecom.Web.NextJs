import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoUpdateInput } from "../types"

export function useUpdateCampoGlobal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoUpdateInput) =>
      apiClient.put(`/api/campos/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos"] })
      qc.invalidateQueries({ queryKey: ["campos", variables.id] })
      // Invalidar la estructura de planillas que usen este campo (best-effort: invalidar todas)
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
