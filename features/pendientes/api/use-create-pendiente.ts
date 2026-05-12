import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Pendiente, PendienteCreateInput } from "../types"

export function useCreatePendiente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PendienteCreateInput) =>
      apiClient.post<ApiResponse<Pendiente>>("/api/pendientes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes"] })
    },
  })
}
