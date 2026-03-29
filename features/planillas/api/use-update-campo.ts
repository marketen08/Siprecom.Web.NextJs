import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaCampoUpdateInput } from "../types"

export function useUpdateCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaCampoUpdateInput) =>
      apiClient.put(`/api/planillas/${data.planillaId}/campos/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
