import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteUsuarioRol(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (asignacionId: string) =>
      apiClient.delete(`/api/proyectos/${proyectoId}/usuarios-roles/${asignacionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos", proyectoId, "usuarios-roles"] })
    },
  })
}
