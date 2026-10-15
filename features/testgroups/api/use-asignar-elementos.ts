import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useAsignarElementos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { testGroupId: string; elementoIds: string[] }) =>
      apiClient.post(`/api/testgroups/${payload.testGroupId}/elementos`, {
        elementoIds: payload.elementoIds,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
      queryClient.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
