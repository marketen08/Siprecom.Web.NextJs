import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceSistemaDTO } from "../types"

export function useGetAvanceSistema(sistemaId: string | undefined) {
  return useQuery({
    queryKey: ["avance", "sistema", sistemaId],
    queryFn: () => apiClient.get<ApiResponse<AvanceSistemaDTO>>(`/api/avance/sistema/${sistemaId}`),
    enabled: !!sistemaId,
  })
}
