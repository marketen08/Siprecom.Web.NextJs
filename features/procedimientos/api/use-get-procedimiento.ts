import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Procedimiento } from "../types"
import type { ApiResponse } from "@/features/proyectos/types"

export function useGetProcedimiento(id: string | null) {
  return useQuery({
    queryKey: ["procedimientos", id],
    queryFn: () => apiClient.get<ApiResponse<Procedimiento>>(`/api/procedimientos/${id}`),
    enabled: !!id,
  })
}
