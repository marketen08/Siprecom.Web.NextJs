import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoCreateInput } from "../types"

export function useCreateCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampoCreateInput) => apiClient.post("/api/campos", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos"] })
    },
  })
}
