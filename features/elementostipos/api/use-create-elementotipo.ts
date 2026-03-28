import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipoCreateInput } from "../types"

export function useCreateElementoTipo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ElementoTipoCreateInput) =>
      apiClient.post("/api/elementostipos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementostipos"] })
    },
  })
}
