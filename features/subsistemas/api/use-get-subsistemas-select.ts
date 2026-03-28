import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistema } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

export function useGetSubSistemasSelect() {
  return useQuery({
    queryKey: ["subsistemas", "select"],
    queryFn: () => apiClient.get<PagedResponse<SubSistema>>("/api/subsistemas"),
  })
}
