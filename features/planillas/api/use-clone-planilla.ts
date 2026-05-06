import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Planilla } from "../types"

export function useClonePlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ data: Planilla }>(`/api/planillas/${id}/clone`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
