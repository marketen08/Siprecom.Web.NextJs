import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetCamposSelect() {
  return useQuery({
    queryKey: ["campos", "select"],
    queryFn: () => apiClient.get("/api/campos"),
  })
}
