import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Modulo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetModulos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["modulos", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Modulo>>("/api/modulos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
