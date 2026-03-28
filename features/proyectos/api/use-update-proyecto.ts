import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProyectoUpdateInput } from "../types"

export function useUpdateProyecto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProyectoUpdateInput) =>
      apiClient.put(`/api/proyectos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}
