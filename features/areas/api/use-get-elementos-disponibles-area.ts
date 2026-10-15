import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"
import type { ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"

interface Params {
  areaId: string | null
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useGetElementosDisponiblesArea({
  areaId, subSistemaId, elementoTipoId, especialidadId, search,
  page = 1, pageSize = 50,
}: Params) {
  return useQuery({
    queryKey: [
      "areas", areaId, "elementos-disponibles",
      { subSistemaId, elementoTipoId, especialidadId, search, page, pageSize },
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<PagedResponse<ElementoAsignable>>>(
        `/api/areas/${areaId}/elementos-disponibles`,
        {
          page,
          pageSize,
          ...(subSistemaId ? { subSistemaId } : {}),
          ...(elementoTipoId ? { elementoTipoId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
          ...(search ? { search } : {}),
        }
      ),
    enabled: !!areaId,
  })
}
