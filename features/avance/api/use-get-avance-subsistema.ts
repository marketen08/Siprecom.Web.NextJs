import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceSubSistemaDTO } from "../types"

export function useGetAvanceSubsistema(subSistemaId: string | undefined) {
  return useQuery({
    queryKey: ["avance", "subsistema", subSistemaId],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceSubSistemaDTO>>(
        `/api/avance/subsistema/${subSistemaId}`,
      ),
    enabled: !!subSistemaId,
  })
}
