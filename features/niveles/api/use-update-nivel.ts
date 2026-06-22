import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { NivelUpdateInput } from "../types"

export function useUpdateNivel(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: NivelUpdateInput) => apiClient.put(`/api/niveles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveles"] })
    },
  })
}
