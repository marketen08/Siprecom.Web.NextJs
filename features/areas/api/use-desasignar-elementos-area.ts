import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Desasigna N elementos del área en una sola llamada. Reemplaza el for-loop
 * secuencial de useDesasignarElementoArea para operaciones masivas — pasa de
 * N HTTP round-trips a 1.
 */
export function useDesasignarElementosArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { areaId: string; elementoIds: string[] }) =>
      apiClient.post(
        `/api/areas/${payload.areaId}/elementos/desasignar-bulk`,
        { elementoIds: payload.elementoIds },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["areas"] })
      qc.invalidateQueries({ queryKey: ["areas", variables.areaId] })
      qc.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
