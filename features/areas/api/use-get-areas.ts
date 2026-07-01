import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Area } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetAreas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["areas", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Area>>("/api/areas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
