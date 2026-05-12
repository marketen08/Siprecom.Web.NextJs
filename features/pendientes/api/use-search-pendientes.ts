import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteFilterInput } from "../types"

interface SearchParams {
  page?: number
  pageSize?: number
  filter?: PendienteFilterInput
}

export function useSearchPendientes(params: SearchParams = {}) {
  const { page = 1, pageSize = 20, filter } = params
  return useQuery({
    queryKey: ["pendientes", "search", { page, pageSize, filter }],
    queryFn: () =>
      apiClient.post<PagedResponse<Pendiente>>("/api/pendientes/search", {
        page,
        pageSize,
        filter,
      }),
  })
}
