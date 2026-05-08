import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoOpcionUpdateInput } from "../types"

export function useUpdateOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoOpcionUpdateInput) =>
      apiClient.put(`/api/campos/${data.campoId}/opciones/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "opciones"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
