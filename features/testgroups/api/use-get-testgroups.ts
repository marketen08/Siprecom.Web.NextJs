import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TestGroup, TipoTestGroup } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  tipo?: TipoTestGroup
  subSistemaId?: string
}

export function useGetTestGroups(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, tipo, subSistemaId } = params
  return useQuery({
    queryKey: ["testgroups", { page, pageSize, nombre, tipo, subSistemaId }],
    queryFn: () =>
      apiClient.get<PagedResponse<TestGroup>>("/api/testgroups", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(tipo != null ? { tipo } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
      }),
  })
}
