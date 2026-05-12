import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteDetalle } from "../types"

export function useGetPendiente(id: string | null) {
  return useQuery({
    queryKey: ["pendientes", id],
    queryFn: () => apiClient.get<ApiResponse<PendienteDetalle>>(`/api/pendientes/${id}`),
    enabled: !!id,
  })
}
