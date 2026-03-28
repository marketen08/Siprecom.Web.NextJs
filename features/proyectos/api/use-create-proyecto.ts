import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProyectoCreateInput } from "../types"

export function useCreateProyecto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProyectoCreateInput) =>
      apiClient.post("/api/proyectos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}
