import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistema } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetSubSistema(id: string | null) {
  return useQuery({
    queryKey: ["subsistemas", id],
    queryFn: () => apiClient.get<ApiResponse<SubSistema>>(`/api/subsistemas/${id}`),
    enabled: !!id,
  })
}
