import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"
import type { ElementoAsignable } from "./use-get-elementos-asignados"

interface Params {
  testGroupId: string | null
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useGetElementosDisponibles({
  testGroupId, subSistemaId, elementoTipoId, especialidadId, search,
  page = 1, pageSize = 50,
}: Params) {
  return useQuery({
    queryKey: [
      "testgroups", testGroupId, "elementos-disponibles",
      { subSistemaId, elementoTipoId, especialidadId, search, page, pageSize },
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<PagedResponse<ElementoAsignable>>>(
        `/api/testgroups/${testGroupId}/elementos-disponibles`,
        {
          page,
          pageSize,
          ...(subSistemaId ? { subSistemaId } : {}),
          ...(elementoTipoId ? { elementoTipoId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
          ...(search ? { search } : {}),
        }
      ),
    enabled: !!testGroupId,
  })
}
