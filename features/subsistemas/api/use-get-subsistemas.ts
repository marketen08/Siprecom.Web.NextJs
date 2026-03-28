import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistema } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetSubSistemas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["subsistemas", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<SubSistema>>("/api/subsistemas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
