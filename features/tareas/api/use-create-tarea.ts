import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TareaCreateInput } from "../types"

export function useCreateTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TareaCreateInput) => apiClient.post("/api/tareas", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] })
    },
  })
}
