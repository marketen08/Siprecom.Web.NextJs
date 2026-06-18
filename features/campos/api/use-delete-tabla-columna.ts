import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface DeleteTablaColumnaInput {
  campoId: string
  columnaId: string
}

export function useDeleteTablaColumna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, columnaId }: DeleteTablaColumnaInput) =>
      apiClient.delete(`/api/campos/${campoId}/tabla/columnas/${columnaId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
