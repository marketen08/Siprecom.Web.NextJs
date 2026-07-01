import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"

export interface ElementoAsignable {
  id: string
  codigo: number
  tag: string
  nombre: string
  elementoTipoNombre: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
}

export function useGetElementosAsignados(testGroupId: string | null) {
  return useQuery({
    queryKey: ["testgroups", testGroupId, "elementos"],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoAsignable[]>>(`/api/testgroups/${testGroupId}/elementos`),
    enabled: !!testGroupId,
  })
}
