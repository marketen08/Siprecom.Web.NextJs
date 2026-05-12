import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { DistribucionGroupBy, DistribucionItemDTO } from "../types"

export function useGetDistribucionPendientes(
  groupBy: DistribucionGroupBy,
  opts: { soloAbiertos?: boolean; enabled?: boolean } = {}
) {
  const { soloAbiertos = true, enabled = true } = opts
  return useQuery({
    queryKey: ["estadisticas", "pendientes", "distribucion", groupBy, soloAbiertos],
    queryFn: () =>
      apiClient.get<ApiResponse<DistribucionItemDTO[]>>(
        `/api/estadisticas/pendientes/distribucion?groupBy=${groupBy}&soloAbiertos=${soloAbiertos}`
      ),
    enabled,
  })
}
