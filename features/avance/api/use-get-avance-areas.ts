import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceAgrupacionDTO } from "../types"

/** Avance agregado por Área del proyecto activo. */
export function useGetAvancePorAreas() {
  return useQuery({
    queryKey: ["avance", "areas"],
    queryFn: () => apiClient.get<ApiResponse<AvanceAgrupacionDTO[]>>("/api/avance/areas"),
  })
}
