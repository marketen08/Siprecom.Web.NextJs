import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteModulo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/modulos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos"] })
    },
  })
}
