import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Usuario } from "../types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetUsuarios(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["usuarios", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Usuario>>("/api/usuarios", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
