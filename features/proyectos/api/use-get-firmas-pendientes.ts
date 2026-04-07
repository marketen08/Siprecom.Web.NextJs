import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "../types"

export function useGetFirmasPendientes(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "firmas-pendientes"],
    queryFn: () =>
      apiClient.get<ApiResponse<number>>(`/api/proyectos/${proyectoId}/firmas-config/pendientes`),
    enabled: !!proyectoId,
  })
}
