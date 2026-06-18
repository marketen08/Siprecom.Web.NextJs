import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoTablaColumnaCreateInput } from "../types"

export function useCreateTablaColumna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoTablaColumnaCreateInput) =>
      apiClient.post(`/api/campos/${data.campoId}/tabla/columnas`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
