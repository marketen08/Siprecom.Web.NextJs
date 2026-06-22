import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Nivel } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetNivel(id: string | null) {
  return useQuery({
    queryKey: ["niveles", id],
    queryFn: () => apiClient.get<ApiResponse<Nivel>>(`/api/niveles/${id}`),
    enabled: !!id,
  })
}
