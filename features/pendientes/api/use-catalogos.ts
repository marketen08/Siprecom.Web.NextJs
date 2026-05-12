import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteCategoria, PendienteEstado, PendienteTipo } from "../types"

// ─── Queries ────────────────────────────────────────────────────────────

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

// ─── Mutations: Categorías ──────────────────────────────────────────────

export function useCreatePendienteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiClient.post<ApiResponse<PendienteCategoria>>("/api/pendientes-categorias", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-categorias"] }),
  })
}

export function useUpdatePendienteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiClient.put<ApiResponse<PendienteCategoria>>(`/api/pendientes-categorias/${id}`, { id, nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-categorias"] }),
  })
}

export function useDeletePendienteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/pendientes-categorias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-categorias"] }),
  })
}

// ─── Mutations: Tipos ───────────────────────────────────────────────────

export function useCreatePendienteTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { tipo: string }) =>
      apiClient.post<ApiResponse<PendienteTipo>>("/api/pendientes-tipos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-tipos"] }),
  })
}

export function useUpdatePendienteTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: string }) =>
      apiClient.put<ApiResponse<PendienteTipo>>(`/api/pendientes-tipos/${id}`, { id, tipo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-tipos"] }),
  })
}

export function useDeletePendienteTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/pendientes-tipos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-tipos"] }),
  })
}
