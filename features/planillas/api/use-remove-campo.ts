import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface RemoveCampoInput {
  planillaId: string
  campoId: string
}

export function useRemoveCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planillaId, campoId }: RemoveCampoInput) =>
      apiClient.delete(`/api/planillas/${planillaId}/campos/${campoId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["planillas", variables.planillaId, "estructura"] })
    },
  })
}
