import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Especialidad, EspecialidadInput } from "../types"

const QK = ["especialidades"] as const

export function useGetEspecialidades() {
  return useQuery({
    queryKey: QK,
    queryFn: () => apiClient.get<ApiResponse<Especialidad[]>>("/api/especialidades"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateEspecialidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EspecialidadInput) =>
      apiClient.post<ApiResponse<Especialidad>>("/api/especialidades", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateEspecialidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: EspecialidadInput & { id: string }) =>
      apiClient.put<ApiResponse<Especialidad>>(`/api/especialidades/${id}`, { id, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteEspecialidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/especialidades/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
