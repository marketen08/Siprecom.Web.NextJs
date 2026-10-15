import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/**
 * Desasigna N elementos del TestGroup en una sola llamada. Reemplaza el for-loop
 * secuencial de useDesasignarElemento para operaciones masivas — pasa de
 * N HTTP round-trips a 1.
 */
export function useDesasignarElementos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { testGroupId: string; elementoIds: string[] }) =>
      apiClient.post(
        `/api/testgroups/${payload.testGroupId}/elementos/desasignar-bulk`,
        { elementoIds: payload.elementoIds },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
      queryClient.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
