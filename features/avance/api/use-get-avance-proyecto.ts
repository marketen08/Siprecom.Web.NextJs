import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceProyectoDTO } from "../types"

export function useGetAvanceProyecto(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["avance", "proyecto", proyectoId],
    queryFn: () => apiClient.get<ApiResponse<AvanceProyectoDTO>>(`/api/avance/proyecto/${proyectoId}`),
    enabled: !!proyectoId,
  })
}
