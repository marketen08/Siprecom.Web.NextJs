import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { AreaUpdateInput } from "../types"

export function useUpdateArea(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AreaUpdateInput) => apiClient.put(`/api/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] })
    },
  })
}
