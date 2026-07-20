import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PidArchivo, PidArchivoDetalle, PidPendientePin } from "../types"
import type { PagedResponse, ApiResponse } from "@/features/proyectos/types"

export function useGetPids() {
  return useQuery({
    queryKey: ["pid-archivos"],
    queryFn: () => apiClient.get<PagedResponse<PidArchivo>>("/api/pid-archivos"),
  })
}

export function useGetPid(id: string | undefined) {
  return useQuery({
    queryKey: ["pid-archivos", id],
    enabled: !!id,
    queryFn: () => apiClient.get<ApiResponse<PidArchivoDetalle>>(`/api/pid-archivos/${id}`),
  })
}

/**
 * Pines del PID para el visor. Se refetchea cada 30s + al foco de la ventana para
 * que dos operadores en el mismo plano vean los pines del otro sin recargar.
 */
export function useGetPidPendientes(id: string | undefined, soloAbiertos = false) {
  return useQuery({
    queryKey: ["pid-archivos", id, "pendientes", { soloAbiertos }],
    enabled: !!id,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: () =>
      apiClient.get<ApiResponse<PidPendientePin[]>>(
        `/api/pid-archivos/${id}/pendientes`,
        soloAbiertos ? { soloAbiertos: "true" } : {},
      ),
  })
}
