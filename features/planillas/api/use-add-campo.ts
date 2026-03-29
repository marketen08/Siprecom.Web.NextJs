import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaCampoCreateInput } from "../types"

export function useAddCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaCampoCreateInput) =>
      apiClient.post(`/api/planillas/${data.planillaId}/campos`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
