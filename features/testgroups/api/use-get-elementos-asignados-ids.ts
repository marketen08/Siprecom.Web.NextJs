import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

interface Params {
  testGroupId: string
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
}

/**
 * Trae los IDs (solo IDs, sin joins) de los elementos ASIGNADOS al pack que
 * matchean los filtros. Se usa para "seleccionar los N que coinciden" cross-page
 * cuando el flujo es desasignación en masa.
 */
export async function fetchElementosAsignadosIds({
  testGroupId, subSistemaId, elementoTipoId, especialidadId, search,
}: Params): Promise<string[]> {
  const params: Record<string, string> = {}
  if (subSistemaId) params.subSistemaId = subSistemaId
  if (elementoTipoId) params.elementoTipoId = elementoTipoId
  if (especialidadId) params.especialidadId = especialidadId
  if (search) params.search = search
  const res = await apiClient.get<ApiResponse<string[]>>(
    `/api/testgroups/${testGroupId}/elementos/ids`,
    Object.keys(params).length > 0 ? params : undefined,
  )
  return res.data ?? []
}
