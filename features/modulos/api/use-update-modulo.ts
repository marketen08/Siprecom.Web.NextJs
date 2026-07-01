import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ModuloUpdateInput } from "../types"

export function useUpdateModulo(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ModuloUpdateInput) => apiClient.put(`/api/modulos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos"] })
    },
  })
}
