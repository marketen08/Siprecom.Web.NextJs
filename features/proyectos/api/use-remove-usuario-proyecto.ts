import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useRemoveUsuarioProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (usuarioId: string) =>
      apiClient.delete(`/api/proyectos/${proyectoId}/usuarios/${usuarioId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-usuarios", proyectoId] })
    },
  })
}
