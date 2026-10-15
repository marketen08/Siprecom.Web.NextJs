import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { NoConformidadMotivo, NoConformidadTipo } from "../types"

/**
 * Catálogos del módulo. Son globales al tenant y cambian poco, así que se
 * cachean largo: sin esto cada apertura del formulario dispara tres requests
 * que devuelven siempre lo mismo.
 */
const STALE = 10 * 60 * 1000 // 10 min

export interface NoConformidadEstadoCatalogo {
  id: string
  estado: string
}

export function useGetNcTipos() {
  return useQuery({
    queryKey: ["no-conformidades", "catalogos", "tipos"],
    staleTime: STALE,
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadTipo[]>>(
        "/api/no-conformidades-catalogos/tipos",
      ),
  })
}

export function useGetNcEstados() {
  return useQuery({
    queryKey: ["no-conformidades", "catalogos", "estados"],
    staleTime: STALE,
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadEstadoCatalogo[]>>(
        "/api/no-conformidades-catalogos/estados",
      ),
  })
}

export function useGetNcMotivos() {
  return useQuery({
    queryKey: ["no-conformidades", "catalogos", "motivos"],
    staleTime: STALE,
    queryFn: () =>
      apiClient.get<ApiResponse<NoConformidadMotivo[]>>(
        "/api/no-conformidades-catalogos/motivos",
      ),
  })
}
