import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Sistema } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetSistemas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["sistemas", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Sistema>>("/api/sistemas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
