import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaCreateInput } from "../types"

export function useCreatePlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaCreateInput) => apiClient.post("/api/planillas", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
