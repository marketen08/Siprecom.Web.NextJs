import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, FirmaConfigItem } from "../types"

export function useGetFirmasConfig(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "firmas-config"],
    queryFn: () =>
      apiClient.get<ApiResponse<FirmaConfigItem[]>>(`/api/proyectos/${proyectoId}/firmas-config`),
    enabled: !!proyectoId,
  })
}
