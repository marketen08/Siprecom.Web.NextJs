import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface ReorderTablaFilasInput {
  campoId: string
  /** IDs en el orden deseado. El backend asigna Orden = index + 1 atómicamente. */
  orderedIds: string[]
}

export function useReorderTablaFilas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, orderedIds }: ReorderTablaFilasInput) =>
      apiClient.put(`/api/campos/${campoId}/tabla/filas/reorder`, orderedIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
