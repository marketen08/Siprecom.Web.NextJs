import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  especialidadId?: string
}

export function useGetElementosTipos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, especialidadId } = params

  return useQuery({
    queryKey: ["elementostipos", { page, pageSize, nombre, especialidadId }],
    queryFn: () =>
      apiClient.get<PagedResponse<ElementoTipo>>("/api/elementostipos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(especialidadId ? { especialidadId } : {}),
      }),
  })
}
