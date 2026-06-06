import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceElementoDTO } from "../types"

/**
 * Trae el avance de UN Elemento individual (con SubSistema, ElementoTipo y
 * desglose por estado de tareas). Lo consume el panel lateral del visor 3D
 * cuando hace click sobre una entidad vinculada.
 */
export function useGetAvanceElemento(elementoId: string | null | undefined) {
  return useQuery({
    queryKey: ["avance", "elemento", elementoId],
    enabled: !!elementoId,
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceElementoDTO>>(`/api/avance/elemento/${elementoId}`),
    staleTime: 30_000, // 30s — el panel se actualiza cuando cambia entidad, no necesita ser tan vivo
  })
}
