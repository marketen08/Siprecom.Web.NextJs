import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] })
    },
  })
}
