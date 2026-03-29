import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface DeleteSeccionInput {
  planillaId: string
  seccionId: string
}

export function useDeleteSeccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planillaId, seccionId }: DeleteSeccionInput) =>
      apiClient.delete(`/api/planillas/${planillaId}/secciones/${seccionId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
