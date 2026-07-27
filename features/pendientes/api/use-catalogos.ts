import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteAccion, PendienteCategoria, PendienteEstado, PendienteMotivo, PendienteTipo } from "../types"

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
    mutationFn: (data: { tipo: string; categoriaSugeridaId?: string | null }) =>
      apiClient.post<ApiResponse<PendienteTipo>>("/api/pendientes-tipos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-tipos"] }),
  })
}

export function useUpdatePendienteTipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tipo, categoriaSugeridaId }: { id: string; tipo: string; categoriaSugeridaId?: string | null }) =>
      apiClient.put<ApiResponse<PendienteTipo>>(`/api/pendientes-tipos/${id}`, { id, tipo, categoriaSugeridaId }),
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

// ─── Acciones (wizard de descripción) ────────────────────────────────────

export function useGetPendienteAcciones() {
  return useQuery({
    queryKey: ["pendientes-acciones"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteAccion[]>>("/api/pendientes-acciones"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePendienteAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiClient.post<ApiResponse<PendienteAccion>>("/api/pendientes-acciones", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-acciones"] }),
  })
}

export function useUpdatePendienteAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiClient.put<ApiResponse<PendienteAccion>>(`/api/pendientes-acciones/${id}`, { id, nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-acciones"] }),
  })
}

export function useDeletePendienteAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/pendientes-acciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-acciones"] }),
  })
}

// ─── Motivos (wizard de descripción) ─────────────────────────────────────

export function useGetPendienteMotivos() {
  return useQuery({
    queryKey: ["pendientes-motivos"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteMotivo[]>>("/api/pendientes-motivos"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePendienteMotivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string }) =>
      apiClient.post<ApiResponse<PendienteMotivo>>("/api/pendientes-motivos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-motivos"] }),
  })
}

export function useUpdatePendienteMotivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiClient.put<ApiResponse<PendienteMotivo>>(`/api/pendientes-motivos/${id}`, { id, nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-motivos"] }),
  })
}

export function useDeletePendienteMotivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/pendientes-motivos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendientes-motivos"] }),
  })
}
