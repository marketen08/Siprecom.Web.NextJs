import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoTablaColumnaUpdateInput } from "../types"

export function useUpdateTablaColumna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoTablaColumnaUpdateInput) =>
      apiClient.put(`/api/campos/${data.campoId}/tabla/columnas/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
