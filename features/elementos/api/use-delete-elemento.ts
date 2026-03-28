import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteElemento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/elementos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
