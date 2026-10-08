import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Procedimiento } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /**
   * Filtra por equipo dueño. "__none__" = los globales. undefined = lo que el backend
   * decide por defecto: el equipo activo del usuario más los globales, o todo para
   * AdminGlobal.
   */
  equipoId?: string
}

export function useGetProcedimientos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, equipoId } = params

  return useQuery({
    queryKey: ["procedimientos", { page, pageSize, nombre, equipoId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Procedimiento>>("/api/procedimientos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(equipoId ? { equipoId } : {}),
      }),
  })
}
