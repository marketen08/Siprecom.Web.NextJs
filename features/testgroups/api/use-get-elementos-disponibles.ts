import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ElementoAsignable } from "./use-get-elementos-asignados"

interface Params {
  testGroupId: string | null
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
}

export function useGetElementosDisponibles({
  testGroupId, subSistemaId, elementoTipoId, especialidadId, search,
}: Params) {
  return useQuery({
    queryKey: [
      "testgroups", testGroupId, "elementos-disponibles",
      { subSistemaId, elementoTipoId, especialidadId, search },
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoAsignable[]>>(
        `/api/testgroups/${testGroupId}/elementos-disponibles`,
        {
          ...(subSistemaId ? { subSistemaId } : {}),
          ...(elementoTipoId ? { elementoTipoId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
          ...(search ? { search } : {}),
        }
      ),
    enabled: !!testGroupId,
  })
}
