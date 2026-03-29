import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaSeccionUpdateInput } from "../types"

export function useUpdateSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaSeccionUpdateInput) =>
      apiClient.put(`/api/planillas/${data.planillaId}/secciones/${data.id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
