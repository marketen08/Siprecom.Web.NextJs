import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  AvanceSubsistemaFilteredDTO,
  AvanceSubsistemaFilters,
} from "../types"

export function useGetAvanceSubsistemasFiltrado(filters: AvanceSubsistemaFilters) {
  const { sistemaId, nivelId, especialidadId } = filters
  return useQuery({
    queryKey: ["estadisticas", "avance-por-subsistema", filters],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceSubsistemaFilteredDTO[]>>(
        "/api/estadisticas/avance-por-subsistema",
        {
          ...(sistemaId ? { sistemaId } : {}),
          ...(nivelId ? { nivelId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
        },
      ),
  })
}
