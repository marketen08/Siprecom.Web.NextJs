import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDesasignarElementoArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { areaId: string; elementoId: string }) =>
      apiClient.delete(`/api/areas/${payload.areaId}/elementos/${payload.elementoId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["areas"] })
      qc.invalidateQueries({ queryKey: ["areas", variables.areaId] })
      qc.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
