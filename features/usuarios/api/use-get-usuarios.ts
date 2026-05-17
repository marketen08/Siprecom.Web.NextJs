import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Usuario } from "../types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /** true = solo dados de baja, false = solo activos, undefined = todos */
  isLocked?: boolean
}

export function useGetUsuarios(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, isLocked } = params

  return useQuery({
    queryKey: ["usuarios", { page, pageSize, nombre, isLocked }],
    queryFn: () =>
      apiClient.get<PagedResponse<Usuario>>("/api/usuarios", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(isLocked !== undefined ? { isLocked: String(isLocked) } : {}),
      }),
  })
}
