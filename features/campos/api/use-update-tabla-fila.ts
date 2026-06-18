import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoTablaFilaUpdateInput } from "../types"

export function useUpdateTablaFila() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoTablaFilaUpdateInput) =>
      apiClient.put(`/api/campos/${data.campoId}/tabla/filas/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
