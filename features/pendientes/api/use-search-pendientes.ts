import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteFilterInput } from "../types"

interface SearchParams {
  page?: number
  pageSize?: number
  filter?: PendienteFilterInput
  /** Permite montar el hook sin disparar el fetch (ej. con el sheet cerrado). */
  enabled?: boolean
}

export function useSearchPendientes(params: SearchParams = {}) {
  const { page = 1, pageSize = 20, filter, enabled = true } = params
  return useQuery({
    enabled,
    queryKey: ["pendientes", "search", { page, pageSize, filter }],
    queryFn: () =>
      apiClient.post<PagedResponse<Pendiente>>("/api/pendientes/search", {
        page,
        pageSize,
        filter,
      }),
  })
}
