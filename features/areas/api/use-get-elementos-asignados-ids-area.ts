import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Params {
  areaId: string
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
}

/**
 * Trae los IDs (solo IDs, sin joins) de los elementos ASIGNADOS al área que
 * matchean los filtros. Se usa para "seleccionar los N que coinciden" cross-page
 * cuando el flujo es desasignación en masa.
 */
export async function fetchElementosAsignadosIdsArea({
  areaId, subSistemaId, elementoTipoId, especialidadId, search,
}: Params): Promise<string[]> {
  const params: Record<string, string> = {}
  if (subSistemaId) params.subSistemaId = subSistemaId
  if (elementoTipoId) params.elementoTipoId = elementoTipoId
  if (especialidadId) params.especialidadId = especialidadId
  if (search) params.search = search
  const res = await apiClient.get<ApiResponse<string[]>>(
    `/api/areas/${areaId}/elementos/ids`,
    Object.keys(params).length > 0 ? params : undefined,
  )
  return res.data ?? []
}
