import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetProcedimientosSelect() {
  return useQuery({
    queryKey: ["procedimientos", "select"],
    queryFn: () => apiClient.get("/api/procedimientos"),
  })
}
