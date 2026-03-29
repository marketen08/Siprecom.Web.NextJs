import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlanillaSeccionCreateInput } from "../types"

export function useCreateSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanillaSeccionCreateInput) =>
      apiClient.post(`/api/planillas/${data.planillaId}/secciones`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
