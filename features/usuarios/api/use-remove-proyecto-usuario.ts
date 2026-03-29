import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useRemoveProyectoUsuario(usuarioId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.delete(`/api/usuarios/${usuarioId}/proyectos/${proyectoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
    },
  })
}
