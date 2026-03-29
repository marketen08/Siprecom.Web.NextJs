import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetPlanillasSelect() {
  return useQuery({
    queryKey: ["planillas", "select"],
    queryFn: () => apiClient.get("/api/planillas"),
  })
}
