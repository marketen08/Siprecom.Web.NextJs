import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useAsignarElementosArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { areaId: string; elementoIds: string[] }) =>
      apiClient.post(`/api/areas/${payload.areaId}/elementos`, {
        elementoIds: payload.elementoIds,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["areas"] })
      qc.invalidateQueries({ queryKey: ["areas", variables.areaId] })
      qc.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
