import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteProcedimiento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/procedimientos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] })
    },
  })
}
