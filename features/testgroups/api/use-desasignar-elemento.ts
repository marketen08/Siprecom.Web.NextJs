import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDesasignarElemento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { testGroupId: string; elementoId: string }) =>
      apiClient.delete(`/api/testgroups/${payload.testGroupId}/elementos/${payload.elementoId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
      queryClient.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
