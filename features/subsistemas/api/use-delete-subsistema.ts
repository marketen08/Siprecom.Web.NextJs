import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteSubSistema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/subsistemas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subsistemas"] })
    },
  })
}
