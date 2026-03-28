import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteElementoTipo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/elementostipos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementostipos"] })
    },
  })
}
