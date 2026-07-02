import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"

// Reutilizamos el shape ElementoAsignable de testgroups — el DTO es idéntico.
export type { ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"

export function useGetElementosAsignadosArea(areaId: string | null) {
  return useQuery({
    queryKey: ["areas", areaId, "elementos"],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoAsignable[]>>(`/api/areas/${areaId}/elementos`),
    enabled: !!areaId,
  })
}
