import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PagedResponse } from "@/features/proyectos/types"

export interface ElementoAsignable {
  id: string
  codigo: number
  tag: string
  nombre: string
  elementoTipoNombre: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
}

interface Params {
  testGroupId: string | null
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useGetElementosAsignados({
  testGroupId, subSistemaId, elementoTipoId, especialidadId, search,
  page = 1, pageSize = 50,
}: Params) {
  return useQuery({
    queryKey: [
      "testgroups", testGroupId, "elementos",
      { subSistemaId, elementoTipoId, especialidadId, search, page, pageSize },
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<PagedResponse<ElementoAsignable>>>(
        `/api/testgroups/${testGroupId}/elementos`,
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
