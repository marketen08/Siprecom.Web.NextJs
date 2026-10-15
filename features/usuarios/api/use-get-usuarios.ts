import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Usuario } from "../types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /** true = solo dados de baja, false = solo activos, undefined = todos */
  isLocked?: boolean
  /** Filtra por empresa (cliente o contratista). */
  clienteId?: string
  /** Filtra por rol asignado (ej "Admin"). */
  rol?: string
  /** Filtra por grupo de usuarios: sólo miembros activos del grupo. */
  grupoId?: string
}

export function useGetUsuarios(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, isLocked, clienteId, rol, grupoId } = params

  return useQuery({
    queryKey: ["usuarios", { page, pageSize, nombre, isLocked, clienteId, rol, grupoId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Usuario>>("/api/usuarios", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(isLocked !== undefined ? { isLocked: String(isLocked) } : {}),
        ...(clienteId ? { clienteId } : {}),
        ...(rol ? { rol } : {}),
        ...(grupoId ? { grupoId } : {}),
      }),
  })
}
