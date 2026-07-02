import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  AvanceAgrupacionFilteredDTO,
  AvanceAgrupacionFilters,
} from "../types"

export function useGetAvanceModulosFiltrado(filters: AvanceAgrupacionFilters) {
  const { sistemaId, nivelId, especialidadId } = filters
  return useQuery({
    queryKey: ["estadisticas", "avance-por-modulo", filters],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceAgrupacionFilteredDTO[]>>(
        "/api/estadisticas/avance-por-modulo",
        {
          ...(sistemaId ? { sistemaId } : {}),
          ...(nivelId ? { nivelId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
        },
      ),
  })
}
