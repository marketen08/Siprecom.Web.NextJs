import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface ReorderTablaColumnasInput {
  campoId: string
  /** IDs en el orden deseado. El backend asigna Orden = index + 1 atómicamente. */
  orderedIds: string[]
}

export function useReorderTablaColumnas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, orderedIds }: ReorderTablaColumnasInput) =>
      apiClient.put(`/api/campos/${campoId}/tabla/columnas/reorder`, orderedIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "tabla"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
