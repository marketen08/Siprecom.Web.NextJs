import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Area } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetArea(id: string | null) {
  return useQuery({
    queryKey: ["areas", id],
    queryFn: () => apiClient.get<ApiResponse<Area>>(`/api/areas/${id}`),
    enabled: !!id,
  })
}
