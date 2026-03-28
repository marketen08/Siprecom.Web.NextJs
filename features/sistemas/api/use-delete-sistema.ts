import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteSistema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/sistemas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistemas"] })
    },
  })
}
