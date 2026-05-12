import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ElementosPorSubsistemaDTO } from "../types"

export function useGetElementosPorSubsistema() {
  return useQuery({
    queryKey: ["estadisticas", "elementos", "por-subsistema"],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementosPorSubsistemaDTO[]>>(
        "/api/estadisticas/elementos/por-subsistema"
      ),
  })
}
