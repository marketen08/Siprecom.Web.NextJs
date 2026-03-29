import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface DeleteOpcionInput {
  campoId: string
  opcionId: string
}

export function useDeleteOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, opcionId }: DeleteOpcionInput) =>
      apiClient.delete(`/api/campos/${campoId}/opciones/${opcionId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "opciones"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
