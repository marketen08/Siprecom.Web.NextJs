import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  especialidadId?: string
  /** null/undefined = todos. true/false = filtro por flag. */
  esSintetico?: boolean
  permiteAgrupar?: boolean
  /**
   * Equipo de administracion dueno. "__none__" trae los globales. Sin esto el backend ya
   * acota al equipo activo del usuario: este filtro sirve para mirar otro (AdminGlobal ve
   * todos, y un Admin con dos equipos puede mirar el que no tiene activo).
   */
  equipoId?: string
}

export function useGetElementosTipos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, especialidadId, esSintetico, permiteAgrupar, equipoId } = params

  return useQuery({
    queryKey: [
      "elementostipos",
      { page, pageSize, nombre, especialidadId, esSintetico, permiteAgrupar, equipoId },
    ],
    queryFn: () =>
      apiClient.get<PagedResponse<ElementoTipo>>("/api/elementostipos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(especialidadId ? { especialidadId } : {}),
        ...(esSintetico !== undefined ? { esSintetico: String(esSintetico) } : {}),
        ...(permiteAgrupar !== undefined ? { permiteAgrupar: String(permiteAgrupar) } : {}),
        ...(equipoId ? { equipoId } : {}),
      }),
  })
}
