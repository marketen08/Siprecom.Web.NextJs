import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoUpdateInput } from "../types"

export function useUpdateElemento(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ElementoUpdateInput) =>
      apiClient.put(`/api/elementos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
    },
  })
}
