import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, FirmaConfigItem } from "../types"

/**
 * Opciones de la query, extraídas para poder pedir la config de OTRO proyecto
 * de forma imperativa (`queryClient.fetchQuery`) sin duplicar key ni fetcher.
 * Lo usa el diálogo "Traer de otro proyecto" del tab Firmas.
 */
export function firmasConfigQueryOptions(proyectoId: string) {
  return {
    queryKey: ["proyectos", proyectoId, "firmas-config"] as const,
    queryFn: () =>
      apiClient.get<ApiResponse<FirmaConfigItem[]>>(`/api/proyectos/${proyectoId}/firmas-config`),
  }
}

export function useGetFirmasConfig(proyectoId: string | undefined) {
  return useQuery({
    ...firmasConfigQueryOptions(proyectoId as string),
    enabled: !!proyectoId,
  })
}
