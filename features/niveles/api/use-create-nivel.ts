import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { NivelCreateInput } from "../types"

export function useCreateNivel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: NivelCreateInput) => apiClient.post("/api/niveles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveles"] })
    },
  })
}
