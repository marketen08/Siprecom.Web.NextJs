import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Planilla } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetPlanillas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["planillas", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Planilla>>("/api/planillas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
