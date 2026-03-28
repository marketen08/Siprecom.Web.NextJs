import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipoUpdateInput } from "../types"

export function useUpdateElementoTipo(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ElementoTipoUpdateInput) =>
      apiClient.put(`/api/elementostipos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementostipos"] })
    },
  })
}
