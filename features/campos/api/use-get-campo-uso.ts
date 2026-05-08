import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CampoUsoPlanilla } from "../types"

export function useGetCampoUso(campoId: string | null) {
  return useQuery({
    queryKey: ["campos", campoId, "uso"],
    queryFn: () => apiClient.get<{ data: CampoUsoPlanilla[] }>(`/api/campos/${campoId}/uso`),
    enabled: !!campoId,
  })
}
