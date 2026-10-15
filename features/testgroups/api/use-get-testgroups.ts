import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { EstadoTestGroup, TestGroup } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  subSistemaId?: string
  /** Lista de estados a incluir. Ej: [2, 3] para ACTIVO + COMPLETADO. Se envía como CSV. */
  estados?: EstadoTestGroup[]
  especialidadId?: string
}

export function useGetTestGroups(params: Params = {}) {
  const {
    page = 1, pageSize = 10, nombre, subSistemaId, estados, especialidadId,
  } = params
  const estadosCsv = estados && estados.length > 0 ? estados.join(",") : undefined
  return useQuery({
    queryKey: [
      "testgroups",
      { page, pageSize, nombre, subSistemaId, estadosCsv, especialidadId },
    ],
    queryFn: () =>
      apiClient.get<PagedResponse<TestGroup>>("/api/testgroups", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
        ...(estadosCsv ? { estados: estadosCsv } : {}),
        ...(especialidadId ? { especialidadId } : {}),
      }),
  })
}
