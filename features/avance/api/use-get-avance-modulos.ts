import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceAgrupacionDTO } from "../types"

/** Avance agregado por Módulo del proyecto activo. */
export function useGetAvancePorModulos() {
  return useQuery({
    queryKey: ["avance", "modulos"],
    queryFn: () => apiClient.get<ApiResponse<AvanceAgrupacionDTO[]>>("/api/avance/modulos"),
  })
}
