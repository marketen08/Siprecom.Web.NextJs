import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { RegistroDetalle } from "../types"

export function useGetRegistroDetalle(registroId: string | null) {
  return useQuery({
    queryKey: ["registros", registroId, "detalle"],
    queryFn: () => apiClient.get<ApiResponse<RegistroDetalle>>(`/api/registros/${registroId}/detalle`),
    enabled: !!registroId,
  })
}
