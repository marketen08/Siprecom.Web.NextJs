import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProcedimientoCreateInput } from "../types"

export function useCreateProcedimiento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProcedimientoCreateInput) =>
      apiClient.post("/api/procedimientos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] })
    },
  })
}
