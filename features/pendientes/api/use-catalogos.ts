import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteCategoria, PendienteEstado, PendienteTipo } from "../types"

export function useGetPendienteCategorias() {
  return useQuery({
    queryKey: ["pendientes-categorias"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteCategoria[]>>("/api/pendientes-categorias"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGetPendienteTipos() {
  return useQuery({
    queryKey: ["pendientes-tipos"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteTipo[]>>("/api/pendientes-tipos"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGetPendienteEstados() {
  return useQuery({
    queryKey: ["pendientes-estados"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteEstado[]>>("/api/pendientes-estados"),
    staleTime: 1000 * 60 * 10,
  })
}
