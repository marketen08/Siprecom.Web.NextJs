import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SistemaUpdateInput } from "../types"

export function useUpdateSistema(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SistemaUpdateInput) =>
      apiClient.put(`/api/sistemas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistemas"] })
    },
  })
}
