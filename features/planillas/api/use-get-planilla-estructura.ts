import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetPlanillaEstructura(id: string | null) {
  return useQuery({
    queryKey: ["planillas", id, "estructura"],
    queryFn: () => apiClient.get(`/api/planillas/${id}/estructura`),
    enabled: !!id,
  })
}
