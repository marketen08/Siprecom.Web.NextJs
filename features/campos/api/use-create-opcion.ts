import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoOpcionCreateInput } from "../types"

export function useCreateOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoOpcionCreateInput) =>
      apiClient.post(`/api/campos/${data.campoId}/opciones`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "opciones"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
