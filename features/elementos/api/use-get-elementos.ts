import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Elemento } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetElementos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["elementos", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Elemento>>("/api/elementos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
