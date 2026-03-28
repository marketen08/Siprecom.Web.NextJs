import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SistemaCreateInput } from "../types"

export function useCreateSistema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SistemaCreateInput) =>
      apiClient.post("/api/sistemas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistemas"] })
    },
  })
}
