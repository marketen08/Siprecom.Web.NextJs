import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProcedimientoUpdateInput } from "../types"

export function useUpdateProcedimiento(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProcedimientoUpdateInput) =>
      apiClient.put(`/api/procedimientos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] })
    },
  })
}
