import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteUpdateInput } from "../types"

export function useUpdatePendiente(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PendienteUpdateInput) =>
      apiClient.put<ApiResponse<Pendiente>>(`/api/pendientes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
      qc.invalidateQueries({ queryKey: ["pendientes", id] })
    },
  })
}
