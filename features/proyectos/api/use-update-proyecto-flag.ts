import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProyectoBoolUpdateInput } from "../types"

export function useUpdateProyectoFlag(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProyectoBoolUpdateInput) =>
      apiClient.patch(`/api/proyectos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos", id] })
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}
