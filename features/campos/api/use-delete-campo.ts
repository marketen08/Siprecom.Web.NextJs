import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteCampoGlobal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/campos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos"] })
    },
  })
}
