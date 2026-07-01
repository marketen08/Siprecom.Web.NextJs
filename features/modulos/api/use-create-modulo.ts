import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ModuloCreateInput } from "../types"

export function useCreateModulo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ModuloCreateInput) => apiClient.post("/api/modulos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modulos"] })
    },
  })
}
