import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Cliente } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetClientes(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["clientes", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Cliente>>("/api/clientes", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
