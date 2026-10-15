import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetPlanillasSelect() {
  return useQuery({
    queryKey: ["planillas", "select"],
    // Sin page/pageSize el backend devuelve TODAS las planillas (no paginadas).
    queryFn: () => apiClient.get("/api/planillas"),
  })
}
