import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Nivel } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetNiveles(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["niveles", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Nivel>>("/api/niveles", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
