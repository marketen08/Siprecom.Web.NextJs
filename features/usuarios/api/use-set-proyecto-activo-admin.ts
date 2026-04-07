import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useSetProyectoActivoAdmin(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.put(`/api/usuarios/${usuarioId}/proyecto`, { proyectoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-proyectos", usuarioId] })
      queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
