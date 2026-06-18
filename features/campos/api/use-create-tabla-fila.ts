import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoTablaFilaCreateInput } from "../types"

export function useCreateTablaFila() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoTablaFilaCreateInput) =>
      apiClient.post(`/api/campos/${data.campoId}/tabla/filas`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
