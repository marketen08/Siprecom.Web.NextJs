import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteNivel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/niveles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveles"] })
    },
  })
}
