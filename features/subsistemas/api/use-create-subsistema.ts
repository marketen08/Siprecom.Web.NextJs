import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistemaCreateInput } from "../types"

export function useCreateSubSistema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubSistemaCreateInput) =>
      apiClient.post("/api/subsistemas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subsistemas"] })
    },
  })
}
