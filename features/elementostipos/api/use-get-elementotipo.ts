import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipo } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetElementoTipo(id: string | null) {
  return useQuery({
    queryKey: ["elementostipos", id],
    queryFn: () => apiClient.get<ApiResponse<ElementoTipo>>(`/api/elementostipos/${id}`),
    enabled: !!id,
  })
}
