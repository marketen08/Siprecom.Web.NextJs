import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface DeleteTablaFilaInput {
  campoId: string
  filaId: string
}

export function useDeleteTablaFila() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, filaId }: DeleteTablaFilaInput) =>
      apiClient.delete(`/api/campos/${campoId}/tabla/filas/${filaId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
