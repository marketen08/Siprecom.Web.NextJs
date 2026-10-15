import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Modulo } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetModulo(id: string | null) {
  return useQuery({
    queryKey: ["modulos", id],
    queryFn: () => apiClient.get<ApiResponse<Modulo>>(`/api/modulos/${id}`),
    enabled: !!id,
  })
}
