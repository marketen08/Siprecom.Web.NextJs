import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"

interface Params {
  areaId: string | null
  subSistemaId?: string
  elementoTipoId?: string
  especialidadId?: string
  search?: string
}

export function useGetElementosDisponiblesArea({
  areaId, subSistemaId, elementoTipoId, especialidadId, search,
}: Params) {
  return useQuery({
    queryKey: [
      "areas", areaId, "elementos-disponibles",
      { subSistemaId, elementoTipoId, especialidadId, search },
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoAsignable[]>>(
        `/api/areas/${areaId}/elementos-disponibles`,
        {
          ...(subSistemaId ? { subSistemaId } : {}),
          ...(elementoTipoId ? { elementoTipoId } : {}),
          ...(especialidadId ? { especialidadId } : {}),
          ...(search ? { search } : {}),
        }
      ),
    enabled: !!areaId,
  })
}
