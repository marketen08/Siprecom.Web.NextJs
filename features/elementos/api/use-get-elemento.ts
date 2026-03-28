import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Elemento } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetElemento(id: string | null) {
  return useQuery({
    queryKey: ["elementos", id],
    queryFn: () => apiClient.get<ApiResponse<Elemento>>(`/api/elementos/${id}`),
    enabled: !!id,
  })
}
