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
 * Trae los IDs (solo IDs, sin joins) de los elementos disponibles agrupables
 * que matchean los filtros. Se usa para "seleccionar los N que coinciden"
 * cross-page. No es hook de React Query porque se dispara on-demand al click.
 */
export async function fetchElementosDisponiblesIds({
  testGroupId, subSistemaId, elementoTipoId, especialidadId, search,
}: Params): Promise<string[]> {
  const params: Record<string, string> = {}
  if (subSistemaId) params.subSistemaId = subSistemaId
  if (elementoTipoId) params.elementoTipoId = elementoTipoId
  if (especialidadId) params.especialidadId = especialidadId
  if (search) params.search = search
  const res = await apiClient.get<ApiResponse<string[]>>(
    `/api/testgroups/${testGroupId}/elementos-disponibles/ids`,
    Object.keys(params).length > 0 ? params : undefined,
  )
  return res.data ?? []
}
