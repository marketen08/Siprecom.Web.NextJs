import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface ReorderOpcionesInput {
  campoId: string
  /** IDs en el orden deseado. El backend asigna Orden = index + 1 atómicamente. */
  orderedIds: string[]
}

export function useReorderOpciones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campoId, orderedIds }: ReorderOpcionesInput) =>
      apiClient.put(`/api/campos/${campoId}/opciones/reorder`, orderedIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["campos", variables.campoId, "opciones"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
