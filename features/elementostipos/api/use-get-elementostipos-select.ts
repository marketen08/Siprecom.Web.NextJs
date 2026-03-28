import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetElementosTiposSelect() {
  return useQuery({
    queryKey: ["elementostipos", "select"],
    queryFn: () => apiClient.get<PagedResponse<ElementoTipo>>("/api/elementostipos"),
  })
}
