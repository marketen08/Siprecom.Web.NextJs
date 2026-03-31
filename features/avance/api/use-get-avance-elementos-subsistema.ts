import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceElementoDTO } from "../types"

export function useGetAvanceElementosSubSistema(subSistemaId: string | undefined) {
  return useQuery({
    queryKey: ["avance", "subsistema", subSistemaId, "elementos"],
    queryFn: () => apiClient.get<ApiResponse<AvanceElementoDTO[]>>(`/api/avance/subsistema/${subSistemaId}/elementos`),
    enabled: !!subSistemaId,
  })
}
