import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Campo } from "../types"

export function useGetCampo(id: string | null) {
  return useQuery({
    queryKey: ["campos", id],
    queryFn: () => apiClient.get<{ data: Campo }>(`/api/campos/${id}`),
    enabled: !!id,
  })
}
