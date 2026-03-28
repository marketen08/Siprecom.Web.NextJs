import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Procedimiento } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetProcedimientos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["procedimientos", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Procedimiento>>("/api/procedimientos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
