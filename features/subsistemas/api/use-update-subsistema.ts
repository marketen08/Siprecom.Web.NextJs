import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistemaUpdateInput } from "../types"

export function useUpdateSubSistema(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubSistemaUpdateInput) =>
      apiClient.put(`/api/subsistemas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subsistemas"] })
    },
  })
}
