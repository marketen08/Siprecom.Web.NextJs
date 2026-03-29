import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaUpdateInput } from "../types"

export function useUpdatePlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaUpdateInput) => apiClient.put(`/api/planillas/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
