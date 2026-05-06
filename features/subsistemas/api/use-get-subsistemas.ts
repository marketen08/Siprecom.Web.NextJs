import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { SubSistema } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  sistemaId?: string
}

export function useGetSubSistemas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, sistemaId } = params

  return useQuery({
    queryKey: ["subsistemas", { page, pageSize, nombre, sistemaId }],
    queryFn: () =>
      apiClient.get<PagedResponse<SubSistema>>("/api/subsistemas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(sistemaId ? { sistemaId } : {}),
      }),
  })
}
