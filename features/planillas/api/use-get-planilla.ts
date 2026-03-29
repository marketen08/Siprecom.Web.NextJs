import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetPlanilla(id: string | null) {
  return useQuery({
    queryKey: ["planillas", id],
    queryFn: () => apiClient.get(`/api/planillas/${id}`),
    enabled: !!id,
  })
}
