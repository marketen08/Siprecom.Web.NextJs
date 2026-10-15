import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PidArchivo } from "@/features/pids/types"

/**
 * PIDs vinculados al subsistema — usa la junction N:N PidArchivoSubSistema.
 * Reemplaza el flujo legacy de "1 plano por subsistema".
 */
export function useGetPidsVinculados(subSistemaId: string | null | undefined) {
  return useQuery({
    queryKey: ["subsistemas", subSistemaId, "pids"],
    enabled: !!subSistemaId,
    queryFn: () => apiClient.get<ApiResponse<PidArchivo[]>>(`/api/subsistemas/${subSistemaId}/pids`),
  })
}
