import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, FirmaConfigItem } from "@/features/proyectos/types"

/**
 * Devuelve el override de firmas de la Tarea. Lista vacía = la tarea hereda del
 * proyecto. Lista con ≥1 elemento = override activo (todo-o-nada).
 */
export function useGetTareaFirmasConfig(tareaId: string | undefined) {
  return useQuery({
    queryKey: ["tareas", tareaId, "firmas-config"],
    queryFn: () =>
      apiClient.get<ApiResponse<FirmaConfigItem[]>>(`/api/tareas/${tareaId}/firmas-config`),
    enabled: !!tareaId,
  })
}
