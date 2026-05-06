import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Proyecto } from "../types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  estado?: number
  clienteId?: string
  contratistaId?: string
}

export function useGetProyectos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, estado, clienteId, contratistaId } = params

  return useQuery({
    queryKey: ["proyectos", { page, pageSize, nombre, estado, clienteId, contratistaId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Proyecto>>("/api/proyectos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(clienteId ? { clienteId } : {}),
        ...(contratistaId ? { contratistaId } : {}),
      }),
  })
}
