import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  AvanceAgrupacionFilteredDTO,
  AvanceAgrupacionFilters,
} from "../types"

export function useGetAvanceAreasFiltrado(filters: AvanceAgrupacionFilters) {
  const { sistemaId, nivelId, especialidadId } = filters
  return useQuery({
    queryKey: ["estadisticas", "avance-por-area", filters],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceAgrupacionFilteredDTO[]>>(
        "/api/estadisticas/avance-por-area",
        {
          ...(sistemaId ? { sistemaId } : {}),
          ...(nivelId ? { nivelId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
        },
      ),
  })
}
