import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Proyecto } from "../types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetProyectos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["proyectos", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Proyecto>>("/api/proyectos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
