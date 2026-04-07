import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { AsignarUsuarioRolInput } from "../types"

export function useAsignarUsuarioRol(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AsignarUsuarioRolInput) =>
      apiClient.post(`/api/proyectos/${proyectoId}/usuarios-roles`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos", proyectoId, "usuarios-roles"] })
    },
  })
}
