import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetNivelesSelect() {
  return useQuery({
    queryKey: ["niveles", "select"],
    queryFn: () => apiClient.get("/api/niveles"),
  })
}
